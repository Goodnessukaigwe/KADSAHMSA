#!/usr/bin/env bash
# Sync plugins/ into moodle/ plugin paths and run upgrade
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT}/docker/docker-compose.yml"
ENV_FILE="${ROOT}/.env"

if [[ ! -d "${ROOT}/moodle" ]]; then
  echo "Moodle missing. Run scripts/clone-moodle.sh first." >&2
  exit 1
fi

sync_one() {
  local src="$1"
  local dest="$2"
  if [[ ! -d "${src}" ]] || [[ -z "$(ls -A "${src}" 2>/dev/null || true)" ]]; then
    echo "Skip (empty/missing): ${src}"
    return 0
  fi
  # Detect if it's just a .gitkeep or placeholder
  if [[ ! -f "${src}/version.php" ]]; then
    echo "Skip (no version.php): ${src}"
    return 0
  fi
  mkdir -p "$(dirname "${dest}")"
  rsync -a --delete \
    --exclude '.git/' \
    "${src}/" "${dest}/"
  echo "Synced ${src} → ${dest}"
}

sync_one "${ROOT}/plugins/customcert" "${ROOT}/moodle/mod/customcert"
sync_one "${ROOT}/plugins/enrol_paystack" "${ROOT}/moodle/enrol/paystack"
sync_one "${ROOT}/plugins/local_orgs" "${ROOT}/moodle/local/orgs"

if [[ -f "${ENV_FILE}" ]] && [[ -f "${ROOT}/moodle/config.php" ]] \
  && docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running 2>/dev/null | grep -q moodle-php; then
  echo "Running Moodle upgrade..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
    php admin/cli/upgrade.php --non-interactive
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u www-data moodle-php \
    php admin/cli/purge_caches.php || true
fi

echo "Plugin sync complete."
