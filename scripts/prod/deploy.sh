#!/usr/bin/env bash
# KADSAMHSA LMS — production deploy / redeploy.
#
#   ./scripts/prod/deploy.sh --first-run   # initial install (runs Moodle installer)
#   ./scripts/prod/deploy.sh               # ship new theme/plugin/code changes
#
# Safe to re-run. Puts the site in maintenance mode during the upgrade window.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT}/.env.production"
COMPOSE_FILE="${ROOT}/docker/docker-compose.prod.yml"
FIRST_RUN=0
SKIP_BACKUP=0

for arg in "$@"; do
  case "${arg}" in
    --first-run) FIRST_RUN=1 ;;
    --skip-backup) SKIP_BACKUP=1 ;;
    *) echo "Unknown option: ${arg}" >&2; exit 1 ;;
  esac
done

dc() { docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"; }
moodle_php() { dc exec -T -u www-data moodle-php "$@"; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy config/.env.production.example and fill it in." >&2
  exit 1
fi

PERMS="$(stat -c '%a' "${ENV_FILE}" 2>/dev/null || stat -f '%A' "${ENV_FILE}")"
if [[ "${PERMS}" != "600" ]]; then
  echo "WARNING: ${ENV_FILE} is mode ${PERMS} — run: chmod 600 ${ENV_FILE}" >&2
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

: "${MOODLE_DOMAIN:?MOODLE_DOMAIN not set in .env.production}"
: "${MOODLE_WWWROOT:?MOODLE_WWWROOT not set in .env.production}"

if grep -q 'CHANGE_ME' "${ENV_FILE}"; then
  echo "ERROR: ${ENV_FILE} still contains CHANGE_ME placeholders. Fill them in first." >&2
  exit 1
fi

step "1/8  Moodle core"
if [[ ! -f "${ROOT}/moodle/admin/cli/install.php" ]]; then
  "${ROOT}/scripts/clone-moodle.sh"
else
  echo "    Present."
fi

step "2/8  Third-party plugins"
if [[ ! -f "${ROOT}/plugins/customcert/version.php" ]] || [[ ! -f "${ROOT}/plugins/enrol_paystack/version.php" ]]; then
  "${ROOT}/scripts/fetch-plugins.sh"
else
  echo "    Present."
fi

if [[ "${FIRST_RUN}" -eq 0 ]] && [[ "${SKIP_BACKUP}" -eq 0 ]] && [[ -f "${ROOT}/moodle/config.php" ]]; then
  step "3/8  Pre-deploy backup"
  "${ROOT}/scripts/prod/backup.sh"
else
  step "3/8  Pre-deploy backup — skipped"
fi

step "4/8  Build and start containers"
dc up -d --build --remove-orphans

echo "    Waiting for database..."
for i in $(seq 1 60); do
  if dc exec -T db mariadb-admin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; then
    echo "    Database ready."
    break
  fi
  [[ "${i}" -eq 60 ]] && { echo "Database did not become ready." >&2; dc logs --tail=50 db; exit 1; }
  sleep 2
done

if [[ "${FIRST_RUN}" -eq 1 ]]; then
  step "5/8  First-run Moodle install"
  "${ROOT}/scripts/prod/install-moodle-prod.sh"
else
  step "5/8  Maintenance mode ON"
  moodle_php php admin/cli/maintenance.php --enable || true
fi

step "6/8  Deploy theme and plugins"
mkdir -p "${ROOT}/moodle/theme/kadsamhsa"
rsync -a --delete --exclude '.git/' "${ROOT}/theme/kadsamhsa/" "${ROOT}/moodle/theme/kadsamhsa/"
for pair in "customcert:mod/customcert" "enrol_paystack:enrol/paystack" "local_orgs:local/orgs"; do
  src="${ROOT}/plugins/${pair%%:*}"
  dest="${ROOT}/moodle/${pair##*:}"
  if [[ -f "${src}/version.php" ]]; then
    mkdir -p "$(dirname "${dest}")"
    rsync -a --delete --exclude '.git/' "${src}/" "${dest}/"
    echo "    ${src} -> ${dest}"
  fi
done

step "7/8  Database upgrade + cache purge"
moodle_php php admin/cli/upgrade.php --non-interactive
moodle_php php admin/cli/purge_caches.php

step "8/8  Maintenance mode OFF + health check"
moodle_php php admin/cli/maintenance.php --disable || true

sleep 3
CODE="$(curl -sk -o /dev/null -w '%{http_code}' "${MOODLE_WWWROOT}/" || echo 000)"
printf '\n\033[1;32mDeploy complete.\033[0m  %s -> HTTP %s\n' "${MOODLE_WWWROOT}" "${CODE}"
if [[ "${CODE}" != "200" && "${CODE}" != "303" && "${CODE}" != "302" ]]; then
  echo "Site did not return a healthy status. Check logs:" >&2
  echo "  docker compose -f docker/docker-compose.prod.yml --env-file .env.production logs --tail=100 caddy moodle-web moodle-php" >&2
  exit 1
fi
