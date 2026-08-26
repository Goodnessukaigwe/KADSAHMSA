#!/usr/bin/env bash
# KADSAMHSA LMS — first-run production install. Called by deploy.sh --first-run.
# Idempotent: exits early if moodle/config.php already exists.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT}/.env.production"
COMPOSE_FILE="${ROOT}/docker/docker-compose.prod.yml"

dc() { docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"; }
moodle_php() { dc exec -T -u www-data moodle-php "$@"; }
cfg() { moodle_php php admin/cli/cfg.php --name="$1" --set="$2" || true; }

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if [[ -f "${ROOT}/moodle/config.php" ]]; then
  echo "moodle/config.php exists — already installed. Skipping."
  exit 0
fi

chmod 777 "${ROOT}/moodle" 2>/dev/null || true

echo "Running Moodle CLI install against ${MOODLE_WWWROOT}..."
moodle_php php admin/cli/install.php \
  --non-interactive \
  --agree-license \
  --lang="${MOODLE_LANG:-en}" \
  --wwwroot="${MOODLE_WWWROOT}" \
  --dataroot="${MOODLE_DATAROOT:-/var/www/moodledata}" \
  --dbtype=mariadb \
  --dbhost="${MYSQL_HOST:-db}" \
  --dbname="${MYSQL_DATABASE:-moodle}" \
  --dbuser="${MYSQL_USER:-moodle}" \
  --dbpass="${MYSQL_PASSWORD}" \
  --dbport="${MYSQL_PORT:-3306}" \
  --fullname="${MOODLE_SITE_FULLNAME:-KADSAMHSA LMS}" \
  --shortname="${MOODLE_SITE_SHORTNAME:-KADSAMHSA}" \
  --adminuser="${MOODLE_ADMIN_USER:-kadsadmin}" \
  --adminpass="${MOODLE_ADMIN_PASS}" \
  --adminemail="${MOODLE_ADMIN_EMAIL}"

# config.php is written by www-data (uid 33) inside the container, so every
# permission change and edit below happens container-side, not on the host.
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u root moodle-php \
  sh -c 'chmod 640 /var/www/html/config.php && chown root:www-data /var/www/html/config.php'
chmod 755 "${ROOT}/moodle" 2>/dev/null || true

if ! grep -q 'KADSAMHSA production overrides' "${ROOT}/moodle/config.php"; then
  echo "Injecting production settings into config.php..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T -u root moodle-php php <<'PHPEOF'
<?php
$path = '/var/www/html/config.php';
$src  = file_get_contents($path);
$block = <<<'BLOCK'

// --- KADSAMHSA production overrides (managed by scripts/prod/install-moodle-prod.sh) ---
// TLS is terminated by the Caddy edge proxy; PHP speaks plain HTTP to nginx.
$CFG->sslproxy = true;
// Cron may only run from the CLI (the compose cron sidecar), never over the web.
$CFG->cronclionly = true;
// Never render debug output to learners.
$CFG->debug = 0;
$CFG->debugdisplay = 0;
// -------------------------------------------------------------------------------------

BLOCK;
$needles = [
    "require_once(__DIR__ . '/lib/setup.php');",
    'require_once(__DIR__ . "/lib/setup.php");',
];
foreach ($needles as $needle) {
    if (strpos($src, $needle) !== false) {
        file_put_contents($path, str_replace($needle, $block . $needle, $src));
        echo "config.php updated\n";
        exit(0);
    }
}
fwrite(STDERR, "Could not find the lib/setup.php require line in config.php\n");
exit(1);
PHPEOF
fi

echo "Configuring outbound SMTP..."
cfg smtphosts "${SMTP_HOST}:${SMTP_PORT}"
cfg smtpuser "${SMTP_USER:-}"
cfg smtppass "${SMTP_PASS:-}"
case "${SMTP_SECURITY:-tls}" in
  tls) cfg smtpsecure tls ;;
  ssl) cfg smtpsecure ssl ;;
  *)   cfg smtpsecure "" ;;
esac
cfg noreplyaddress "${MOODLE_NOREPLY_ADDRESS:-${MOODLE_ADMIN_EMAIL}}"
cfg supportemail "${MOODLE_SUPPORT_EMAIL:-${MOODLE_ADMIN_EMAIL}}"

echo "Applying site settings..."
cfg registerauth "${MOODLE_REGISTERAUTH:-email}"
cfg defaulthomepage "${MOODLE_DEFAULT_HOMEPAGE:-0}"
cfg theme kadsamhsa
cfg timezone "Africa/Lagos"
cfg country NG

echo "Applying security baseline..."
cfg passwordpolicy 1
cfg minpasswordlength 10
cfg cookiesecure 1
cfg cookiehttponly 1
cfg protectusernames 1
cfg preventexecpath 1
cfg enablewebservices 0
cfg allowframembedding 0

echo
echo "Install complete: ${MOODLE_WWWROOT}"
echo "Admin: ${MOODLE_ADMIN_USER}  (password is in .env.production)"
