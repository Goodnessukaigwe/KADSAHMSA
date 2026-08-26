#!/usr/bin/env bash
# Sync theme/kadsamhsa → moodle/theme/kadsamhsa and purge caches
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/theme/kadsamhsa"
DEST="${ROOT}/moodle/theme/kadsamhsa"
COMPOSE_FILE="${ROOT}/docker/docker-compose.yml"
ENV_FILE="${ROOT}/.env"

if [[ ! -d "${SRC}" ]]; then
  echo "Missing theme source ${SRC}" >&2
  exit 1
fi

if [[ ! -d "${ROOT}/moodle/theme" ]]; then
  echo "Moodle theme directory missing. Clone Moodle first." >&2
  exit 1
fi

mkdir -p "${DEST}"
rsync -a --delete \
  --exclude '.git/' \
  "${SRC}/" "${DEST}/"

echo "Theme synced to ${DEST}"

if [[ -f "${ENV_FILE}" ]] && docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running 2>/dev/null | grep -q moodle-php; then
  echo "Running Moodle upgrade (registers theme/lang changes)..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
    php admin/cli/upgrade.php --non-interactive || true
  echo "Purging Moodle caches..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
    php admin/cli/purge_caches.php || true
fi

echo "Done. Activate under Site administration → Appearance → Theme selector (or via CLI)."
