# Local bootstrap (Phase 0)

## Prerequisites

- Docker Engine + Compose v2
- Git
- ~4 GB RAM free, ~5–10 GB disk

## One-time setup

```bash
cd /path/to/KADSAHMSA
cp config/.env.example .env
# Edit .env: set strong MOODLE_ADMIN_PASS and DB passwords for your machine

chmod +x scripts/*.sh
./scripts/clone-moodle.sh
./scripts/fetch-plugins.sh

docker compose -f docker/docker-compose.yml --env-file .env up -d --build
./scripts/install-moodle.sh
./scripts/sync-theme.sh
./scripts/sync-plugins.sh
```

## Local URLs

| Service | URL |
|---------|-----|
| Moodle | http://localhost:8080 |
| Mailpit (captured mail) | http://localhost:8025 |

Admin login: values in `.env` — `MOODLE_ADMIN_USER` / `MOODLE_ADMIN_PASS` (never commit `.env`).

**Note:** nginx sets `SERVER_PORT=8080` so Moodle’s wwwroot (`http://localhost:8080`) matches the published Docker port (avoids login redirect loops).

## Volumes & paths

| Path / volume | Purpose |
|---------------|---------|
| Docker volume `kadsamhsa_moodledata` | Moodle dataroot (`/var/www/moodledata` in containers) |
| Docker volume `kadsamhsa_moodle_db` | MariaDB data |
| `moodle/` (host, gitignored) | Moodle 4.5 core checkout |
| `theme/kadsamhsa/` | Theme working copy |
| `plugins/` | Plugin working copies |

**Backup note (later phases):** back up both named volumes plus any content you keep only on the host. Phase 0 does not automate backups.

## Cron

The `cron` Compose service runs `php admin/cli/cron.php` every 60 seconds.

Manual one-shot:

```bash
./scripts/moodle-cron.sh
```

## Theme sync

```bash
./scripts/sync-theme.sh
```

Activate: **Site administration → Appearance → Theme selector** → choose **KADSAMHSA**, or:

```bash
docker compose -f docker/docker-compose.yml --env-file .env exec -u www-data moodle-php \
  php admin/cli/cfg.php --name=theme --set=kadsamhsa
```

## Plugin sync

```bash
./scripts/sync-plugins.sh
```

Pins and sources: [config/versions.md](../config/versions.md).

- `mod_customcert` → `moodle/mod/customcert`
- `enrol_paystack` (PaystackHQ) → `moodle/enrol/paystack`
- `local_orgs` → `moodle/local/orgs`

Paystack keys stay as placeholders in `.env` until Phase 3.

## SMTP → Mailpit

Install script sets `smtphosts` to `mailpit:1025`. Trigger a password reset or notification and open http://localhost:8025 to confirm capture.

## Smoke test checklist

1. `docker compose -f docker/docker-compose.yml --env-file .env ps` — services up / healthy
2. Open http://localhost:8080 — Moodle login page
3. Admin login works (creds from `.env`)
4. Create a test course; upload a small file
5. Theme `kadsamhsa` visible and activatable
6. Plugins listed under Site administration without install errors
7. Password reset / notification appears in Mailpit
8. Cron has run (`./scripts/moodle-cron.sh` or cron container logs)

Optional helper: `./scripts/smoke-test.sh`

## Stop / reset

```bash
# Stop
docker compose -f docker/docker-compose.yml --env-file .env down

# Destroy DB + moodledata volumes (destructive)
docker compose -f docker/docker-compose.yml --env-file .env down -v
rm -f moodle/config.php   # then re-run install-moodle.sh after up
```
