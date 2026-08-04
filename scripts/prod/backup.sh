#!/usr/bin/env bash
# KADSAMHSA LMS — production backup: database dump + moodledata + config.php.
# Run manually, from deploy.sh, or nightly via cron (see docs/deploy-vps.md).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT}/.env.production"
COMPOSE_FILE="${ROOT}/docker/docker-compose.prod.yml"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

BACKUP_DIR="${BACKUP_DIR:-/opt/kadsamhsa/backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_DIR}/${STAMP}"

dc() { docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"; }

mkdir -p "${DEST}"
echo "==> Backing up to ${DEST}"

echo "    Database..."
dc exec -T db mariadb-dump \
  -u root -p"${MYSQL_ROOT_PASSWORD}" \
  --single-transaction --quick --routines --triggers --events \
  --default-character-set=utf8mb4 \
  "${MYSQL_DATABASE:-moodle}" | gzip -6 > "${DEST}/db.sql.gz"

echo "    moodledata..."
docker run --rm \
  -v kadsamhsa_prod_moodledata:/data:ro \
  -v "${DEST}:/backup" \
  alpine:3.20 \
  tar czf /backup/moodledata.tar.gz -C /data .

if [[ -f "${ROOT}/moodle/config.php" ]]; then
  cp "${ROOT}/moodle/config.php" "${DEST}/config.php"
fi

cat > "${DEST}/MANIFEST.txt" <<MANIFEST
KADSAMHSA LMS backup
Taken:      $(date -Iseconds)
Host:       $(hostname)
Domain:     ${MOODLE_DOMAIN:-unknown}
Moodle ver: $(grep -oP '\$release\s*=\s*.\K[0-9.]+' "${ROOT}/moodle/version.php" 2>/dev/null | head -1 || echo unknown)
DB dump:    db.sql.gz ($(du -h "${DEST}/db.sql.gz" | cut -f1))
Data:       moodledata.tar.gz ($(du -h "${DEST}/moodledata.tar.gz" | cut -f1))
Restore:    ./scripts/prod/restore.sh ${STAMP}
MANIFEST

chmod -R go-rwx "${DEST}"

echo "==> Pruning backups older than ${RETENTION} days"
find "${BACKUP_DIR}" -maxdepth 1 -type d -name '20*-*' -mtime "+${RETENTION}" -exec rm -rf {} + 2>/dev/null || true

echo "==> Done"
cat "${DEST}/MANIFEST.txt"
