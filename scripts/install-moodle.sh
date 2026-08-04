#!/usr/bin/env bash
# Non-interactive Moodle CLI install using repo-root .env
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
COMPOSE_FILE="${ROOT}/docker/docker-compose.yml"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy config/.env.example to .env first." >&2
  exit 1
fi

# Load .env safely (supports quoted values). Avoid set -e abort on comments.
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}" || true
set +a
# Fallback parse if FULLNAME still empty (unquoted legacy .env)
if [[ -z "${MOODLE_SITE_FULLNAME:-}" ]]; then
  MOODLE_SITE_FULLNAME="KADSAMHSA LMS"
fi

if [[ ! -f "${ROOT}/moodle/admin/cli/install.php" ]]; then
  echo "Moodle core missing. Run scripts/clone-moodle.sh first." >&2
  exit 1
fi

if [[ -f "${ROOT}/moodle/config.php" ]]; then
  echo "config.php already exists — Moodle appears installed. Skipping install."
  exit 0
fi

# Bind-mounted moodle/ is often owned by the host user; allow www-data to write config.php
chmod u+w "${ROOT}/moodle" 2>/dev/null || true
chmod 777 "${ROOT}/moodle" 2>/dev/null || true

echo "Waiting for database..."
for i in $(seq 1 60); do
  if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T db \
    mariadb-admin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; then
    break
  fi
  if [[ "${i}" -eq 60 ]]; then
    echo "Database not ready. Is the stack up? (docker compose -f docker/docker-compose.yml --env-file .env up -d)" >&2
    exit 1
  fi
  sleep 2
done

echo "Running Moodle CLI install..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php admin/cli/install.php \
    --non-interactive \
    --agree-license \
    --lang="${MOODLE_LANG:-en}" \
    --wwwroot="${MOODLE_WWWROOT:-http://localhost:8080}" \
    --dataroot="${MOODLE_DATAROOT:-/var/www/moodledata}" \
    --dbtype=mariadb \
    --dbhost="${MYSQL_HOST:-db}" \
    --dbname="${MYSQL_DATABASE:-moodle}" \
    --dbuser="${MYSQL_USER:-moodle}" \
    --dbpass="${MYSQL_PASSWORD}" \
    --dbport="${MYSQL_PORT:-3306}" \
    --fullname="${MOODLE_SITE_FULLNAME:-KADSAMHSA LMS}" \
    --shortname="${MOODLE_SITE_SHORTNAME:-KADSAMHSA}" \
    --adminuser="${MOODLE_ADMIN_USER:-admin}" \
    --adminpass="${MOODLE_ADMIN_PASS}" \
    --adminemail="${MOODLE_ADMIN_EMAIL:-admin@example.com}" \
    --fullname="KADSAMHSA LMS"

# Point SMTP at Mailpit for local mail capture
echo "Configuring SMTP → Mailpit..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php admin/cli/cfg.php --name=smtphosts --set="${SMTP_HOST:-mailpit}:${SMTP_PORT:-1025}" || true
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php admin/cli/cfg.php --name=smtpsecure --set= || true
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php admin/cli/cfg.php --name=noreplyaddress --set="${MOODLE_ADMIN_EMAIL:-admin@example.com}" || true

# Enable email self-registration for local/dev (required for /login/signup.php).
echo "Enabling email self-registration..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php admin/cli/cfg.php --name=registerauth --set=email || true

# Site home = public landing (not /my/ dashboard) while UI work is in progress.
echo "Setting default home page to site front page..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
  php admin/cli/cfg.php --name=defaulthomepage --set=0 || true

echo "Install complete. Open ${MOODLE_WWWROOT:-http://localhost:8080}"
echo "Admin credentials are in .env (MOODLE_ADMIN_USER / MOODLE_ADMIN_PASS)."
