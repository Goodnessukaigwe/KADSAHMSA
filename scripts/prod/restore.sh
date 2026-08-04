#!/usr/bin/env bash
# KADSAMHSA LMS — restore from a backup taken by scripts/prod/backup.sh.
#
#   ./scripts/prod/restore.sh 20260804-021500
#
# DESTRUCTIVE: overwrites the live database and moodledata volume.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT}/.env.production"
COMPOSE_FILE="${ROOT}/docker/docker-compose.prod.yml"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

BACKUP_DIR="${BACKUP_DIR:-/opt/kadsamhsa/backups}"
STAMP="${1:-}"

if [[ -z "${STAMP}" ]]; then
  echo "Usage: $0 <timestamp>"
  echo "Available backups:"
  ls -1 "${BACKUP_DIR}" 2>/dev/null | grep -E '^20[0-9]{6}-[0-9]{6}$' || echo "  (none)"
  exit 1
fi

SRC="${BACKUP_DIR}/${STAMP}"
[[ -d "${SRC}" ]] || { echo "No such backup: ${SRC}" >&2; exit 1; }

dc() { docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"; }

echo "About to restore ${SRC} over the LIVE site (${MOODLE_DOMAIN})."
read -r -p "Type RESTORE to continue: " CONFIRM
[[ "${CONFIRM}" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

echo "==> Maintenance mode ON"
dc exec -T -u www-data moodle-php php admin/cli/maintenance.php --enable || true

echo "==> Restoring database"
gunzip -c "${SRC}/db.sql.gz" | dc exec -T db \
  mariadb -u root -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE:-moodle}"

echo "==> Restoring moodledata"
docker run --rm \
  -v kadsamhsa_prod_moodledata:/data \
  -v "${SRC}:/backup:ro" \
  alpine:3.20 \
  sh -c 'rm -rf /data/* /data/.[!.]* 2>/dev/null; tar xzf /backup/moodledata.tar.gz -C /data'

echo "==> Purging caches"
dc exec -T -u www-data moodle-php php admin/cli/purge_caches.php || true

echo "==> Maintenance mode OFF"
dc exec -T -u www-data moodle-php php admin/cli/maintenance.php --disable || true

echo "==> Restore complete. Verify at ${MOODLE_WWWROOT}"
