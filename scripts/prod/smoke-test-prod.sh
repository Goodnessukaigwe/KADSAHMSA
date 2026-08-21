#!/usr/bin/env bash
# KADSAMHSA LMS — post-deploy production smoke test. Read-only; safe to re-run.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT}/.env.production"
COMPOSE_FILE="${ROOT}/docker/docker-compose.prod.yml"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

dc() { docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"; }
PASS=0; FAIL=0
ok()  { echo "  OK   $*"; PASS=$((PASS+1)); }
bad() { echo "  FAIL $*"; FAIL=$((FAIL+1)); }

echo "=== KADSAMHSA production smoke test — ${MOODLE_DOMAIN} ==="

echo "-- containers --"
for svc in caddy db moodle-php moodle-web cron; do
  if dc ps --status running 2>/dev/null | grep -q "kadsamhsa-${svc%%-*}\|${svc}"; then
    ok "${svc} running"
  else
    bad "${svc} not running"
  fi
done

echo "-- TLS + HTTP --"
CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://${MOODLE_DOMAIN}/" || echo 000)"
[[ "${CODE}" =~ ^(200|302|303)$ ]] && ok "https://${MOODLE_DOMAIN}/ -> ${CODE}" || bad "https -> ${CODE}"

REDIR="$(curl -s -o /dev/null -w '%{http_code}' "http://${MOODLE_DOMAIN}/" || echo 000)"
[[ "${REDIR}" =~ ^(301|308)$ ]] && ok "http redirects to https (${REDIR})" || bad "http -> ${REDIR} (expected 301/308)"

if curl -sI "https://${MOODLE_DOMAIN}/" | grep -qi 'strict-transport-security'; then
  ok "HSTS header present"
else
  bad "HSTS header missing"
fi

EXPIRY="$(echo | openssl s_client -servername "${MOODLE_DOMAIN}" -connect "${MOODLE_DOMAIN}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
[[ -n "${EXPIRY}" ]] && ok "TLS certificate valid until ${EXPIRY}" || bad "could not read TLS certificate"

echo "-- Moodle --"
[[ -f "${ROOT}/moodle/config.php" ]] && ok "config.php present" || bad "config.php missing"
grep -q 'sslproxy' "${ROOT}/moodle/config.php" 2>/dev/null && ok "sslproxy enabled" || bad "sslproxy NOT set — Moodle will build http:// URLs"

WWWROOT="$(dc exec -T -u www-data moodle-php php -r "define('CLI_SCRIPT',true); require('/var/www/html/config.php'); echo \$CFG->wwwroot;" 2>/dev/null)"
[[ "${WWWROOT}" == "https://${MOODLE_DOMAIN}" ]] && ok "wwwroot = ${WWWROOT}" || bad "wwwroot = '${WWWROOT}' (expected https://${MOODLE_DOMAIN})"

THEME="$(dc exec -T -u www-data moodle-php php admin/cli/cfg.php --name=theme 2>/dev/null | tr -d '\r\n')"
[[ "${THEME}" == "kadsamhsa" ]] && ok "theme = kadsamhsa" || bad "theme = '${THEME}'"

for p in mod/customcert enrol/paystack local/orgs theme/kadsamhsa; do
  [[ -f "${ROOT}/moodle/${p}/version.php" ]] && ok "plugin ${p}" || bad "missing ${p}"
done

if dc exec -T -u www-data moodle-php php admin/cli/cron.php >/tmp/kads_cron.out 2>&1; then
  ok "cron.php runs clean"
else
  bad "cron.php failed (see /tmp/kads_cron.out)"
fi

echo "-- security --"
DIRECT="$(curl -s -o /dev/null -w '%{http_code}' "http://${MOODLE_DOMAIN}:8080/" --max-time 5 || echo 000)"
[[ "${DIRECT}" == "000" ]] && ok "port 8080 not exposed" || bad "port 8080 answered ${DIRECT} — close it"

DB="$(curl -s -o /dev/null -w '%{http_code}' "http://${MOODLE_DOMAIN}:3306/" --max-time 5 || echo 000)"
[[ "${DB}" == "000" ]] && ok "port 3306 not exposed" || bad "port 3306 reachable — close it"

CFGLEAK="$(curl -s "https://${MOODLE_DOMAIN}/config.php" --max-time 10 | head -c 200)"
echo "${CFGLEAK}" | grep -qi 'dbpass\|\$CFG' && bad "config.php contents leaked over HTTP" || ok "config.php not readable over HTTP"

echo
echo "=== ${PASS} passed, ${FAIL} failed ==="
[[ "${FAIL}" -eq 0 ]]
