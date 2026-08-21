# KADSAMHSA LMS

Moodle-based Learning Management System for KADSAMHSA (Drug Prevention Training & Certification and related courses).

**Locked stack:** Moodle **4.5 LTS** · PHP **8.2** · MariaDB **10.11** · nginx + PHP-FPM · theme `kadsamhsa` · Mailpit (local email)

Build phases: [PHASES.md](PHASES.md) · Product requirements: [KADSAMHSA_LMS_PRD_v1.md](KADSAMHSA_LMS_PRD_v1.md) · Version pins: [config/versions.md](config/versions.md)

## Directory map

```
KADSAHMSA/
├── docker/                 # compose (local + prod) + caddy/nginx/php configs
├── moodle/                 # Moodle 4.5 core (gitignored; clone via script)
├── theme/kadsamhsa/        # working copy → sync to moodle/theme/kadsamhsa/
├── plugins/                # customcert, enrol_paystack, local_orgs
├── content/dptc/           # DPTC source materials (Phase 4)
├── config/                 # .env.example, versions.md
├── docs/                   # runbooks (local-bootstrap.md, deploy-vps.md)
└── scripts/                # clone, install, sync, cron helpers
    └── prod/               # production deploy, backup, restore, smoke test
```

**Theme convention:** develop in `theme/kadsamhsa/`, then run `scripts/sync-theme.sh` to deploy into `moodle/theme/kadsamhsa/`.

## Quick start (local)

```bash
# 1. Env (never commit .env)
cp config/.env.example .env

# 2. Moodle core + third-party plugins into plugins/
./scripts/clone-moodle.sh
./scripts/fetch-plugins.sh

# 3. Start stack
docker compose -f docker/docker-compose.yml --env-file .env up -d --build

# 4. Install Moodle (once)
./scripts/install-moodle.sh

# 5. Deploy theme + plugins
./scripts/sync-theme.sh
./scripts/sync-plugins.sh
```

| Service | URL |
|---------|-----|
| Moodle | http://localhost:8080 |
| Mailpit UI | http://localhost:8025 |

Admin credentials live only in `.env` (`MOODLE_ADMIN_USER` / `MOODLE_ADMIN_PASS`).

Full bootstrap notes and smoke checklist: [docs/local-bootstrap.md](docs/local-bootstrap.md).

## Production deployment

The production stack adds a **Caddy** edge proxy with automatic Let's Encrypt TLS,
drops Mailpit for a real SMTP relay, publishes no ports except 80/443, and runs
tuned MariaDB and PHP-FPM.

```bash
# On a fresh Ubuntu 24.04 VPS, once DNS points at it:
sudo bash scripts/prod/server-setup.sh          # docker, ufw, fail2ban, deploy user
cp config/.env.production.example .env.production && chmod 600 .env.production
$EDITOR .env.production                          # domain + secrets, no CHANGE_ME left
./scripts/prod/deploy.sh --first-run             # install + TLS + theme + plugins
./scripts/prod/smoke-test-prod.sh                # verify
```

Subsequent releases are `git pull && ./scripts/prod/deploy.sh` (takes a backup,
enters maintenance mode, upgrades, purges caches, exits maintenance mode).

Full runbook — sizing, DNS, backups, upgrades, rollback, troubleshooting:
**[docs/deploy-vps.md](docs/deploy-vps.md)**

| File | Purpose |
|------|---------|
| `docker/docker-compose.prod.yml` | Production stack (caddy, db, moodle-php, moodle-web, cron) |
| `docker/caddy/Caddyfile` | TLS termination, HSTS + security headers, 128 MB body limit |
| `docker/nginx/prod.conf` | App vhost behind the proxy; hardened paths |
| `docker/php/php.prod.ini` · `www.prod.conf` | Production PHP and FPM pool tuning |
| `config/.env.production.example` | Every production setting, all secrets as placeholders |
| `scripts/prod/*.sh` | server-setup · deploy · install · backup · restore · smoke-test |
