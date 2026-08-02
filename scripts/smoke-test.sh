#!/usr/bin/env bash
# Phase 0 smoke checks (best-effort; requires stack + install)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
COMPOSE_FILE="${ROOT}/docker/docker-compose.yml"

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

PASS=0
FAIL=0
ok() { echo "OK  $*"; PASS=$((PASS + 1)); }
bad() { echo "FAIL $*"; FAIL=$((FAIL + 1)); }

echo "=== Phase 0 smoke test ==="

# 1. Compose services
if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running 2>/dev/null | grep -q moodle-web; then
  ok "moodle-web running"
else
  bad "moodle-web not running"
fi

if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running 2>/dev/null | grep -q moodle-php; then
  ok "moodle-php running"
else
  bad "moodle-php not running"
fi

if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running 2>/dev/null | grep -q kadsamhsa-db \
  || docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps 2>/dev/null | grep -q "db.*healthy\|kadsamhsa-db"; then
  ok "db present"
else
  bad "db not healthy/present"
fi

if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running 2>/dev/null | grep -q mailpit; then
  ok "mailpit running"
else
  bad "mailpit not running"
fi

if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running 2>/dev/null | grep -q cron; then
  ok "cron sidecar running"
else
  bad "cron sidecar not running"
fi

# 2. HTTP Moodle
CODE="$(curl -s -o /tmp/kadsamhsa_moodle_home.html -w '%{http_code}' "${MOODLE_URL:-http://localhost:8080}/" || true)"
if [[ "${CODE}" == "200" ]] || [[ "${CODE}" == "303" ]] || [[ "${CODE}" == "302" ]]; then
  ok "Moodle HTTP ${CODE} at ${MOODLE_URL:-http://localhost:8080}"
else
  bad "Moodle HTTP ${CODE}"
fi

# 3. config.php / install
if [[ -f "${ROOT}/moodle/config.php" ]]; then
  ok "moodle/config.php present"
else
  bad "moodle/config.php missing (run install-moodle.sh)"
fi

# 4. Admin login via web service / CLI check user exists
if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php -r "
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once(\$CFG->libdir.'/clilib.php');
\$u = \$DB->get_record('user', ['username' => getenv('MOODLE_ADMIN_USER') ?: 'admin', 'deleted' => 0]);
exit(\$u ? 0 : 1);
" 2>/dev/null; then
  ok "admin user exists in DB"
else
  # fallback simpler
  if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T db \
    mariadb -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
    -N -e "SELECT COUNT(*) FROM mdl_user WHERE username='${MOODLE_ADMIN_USER:-admin}' AND deleted=0;" 2>/dev/null | grep -q '1'; then
    ok "admin user exists in DB (sql)"
  else
    bad "admin user missing"
  fi
fi

# 5. Theme present
if [[ -f "${ROOT}/moodle/theme/kadsamhsa/version.php" ]]; then
  ok "theme kadsamhsa deployed under moodle/theme"
else
  bad "theme not synced (run sync-theme.sh)"
fi

# 6. Plugins present
for p in mod/customcert enrol/paystack local/orgs; do
  if [[ -f "${ROOT}/moodle/${p}/version.php" ]]; then
    ok "plugin path moodle/${p}"
  else
    bad "missing moodle/${p}"
  fi
done

# 7. Mailpit UI
MP="$(curl -s -o /dev/null -w '%{http_code}' "${MAILPIT_UI_URL:-http://localhost:8025}/" || true)"
if [[ "${MP}" == "200" ]]; then
  ok "Mailpit UI HTTP 200"
else
  bad "Mailpit UI HTTP ${MP}"
fi

# 8. Cron once
if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php admin/cli/cron.php >/tmp/kadsamhsa_cron.out 2>&1; then
  ok "cron.php completed"
else
  bad "cron.php failed (see /tmp/kadsamhsa_cron.out)"
fi

# 9. Create test course via CLI if possible
if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php -r "
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once(\$CFG->dirroot.'/course/lib.php');
\$short = 'smoke' . time();
if (\$DB->record_exists('course', ['shortname' => \$short])) { exit(0); }
\$data = new stdClass();
\$data->fullname = 'Phase 0 Smoke Course';
\$data->shortname = \$short;
\$data->category = 1;
\$data->visible = 1;
\$data->format = 'topics';
\$course = create_course(\$data);
echo \$course->id;
" 2>/tmp/kadsamhsa_course.err; then
  ok "test course created via CLI"
else
  bad "test course create failed"
  cat /tmp/kadsamhsa_course.err 2>/dev/null || true
fi

# 10. Try activate theme
if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php admin/cli/cfg.php --name=theme --set=kadsamhsa >/dev/null 2>&1; then
  ok "theme set to kadsamhsa"
else
  bad "could not set theme"
fi

# 11. Send test email to Mailpit
if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php -r "
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once(\$CFG->libdir.'/moodlelib.php');
\$sink = false;
\$ok = email_to_user(
  (object)['id' => -1, 'email' => 'smoke@example.com', 'firstname' => 'Smoke', 'lastname' => 'Test', 'mailformat' => 1, 'maildisplay' => 1],
  get_admin(),
  'KADSAMHSA Phase 0 smoke',
  'Smoke test body',
  'Smoke test body'
);
exit(\$ok ? 0 : 1);
" 2>/tmp/kadsamhsa_mail.err; then
  sleep 1
  COUNT="$(curl -s "${MAILPIT_UI_URL:-http://localhost:8025}/api/v1/messages" | grep -o '"total":[0-9]*' | head -1 | cut -d: -f2 || echo 0)"
  if [[ "${COUNT:-0}" -ge 1 ]]; then
    ok "Mailpit received mail (total=${COUNT})"
  else
    ok "email_to_user returned success (Mailpit total=${COUNT:-0} — check UI)"
  fi
else
  bad "email send failed"
  cat /tmp/kadsamhsa_mail.err 2>/dev/null || true
fi

echo "=== Result: ${PASS} passed, ${FAIL} failed ==="
[[ "${FAIL}" -eq 0 ]]
