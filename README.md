# KADSAMHSA LMS

Moodle-based Learning Management System for KADSAMHSA (Drug Prevention Training & Certification and related courses).

**Locked stack:** Moodle **4.5 LTS** · PHP **8.2** · MariaDB **10.11** · nginx + PHP-FPM · theme `kadsamhsa` · Mailpit (local email)

Build phases: [PHASES.md](PHASES.md) · Product requirements: [KADSAMHSA_LMS_PRD_v1.md](KADSAMHSA_LMS_PRD_v1.md) · Version pins: [config/versions.md](config/versions.md)

## Directory map

```
KADSAHMSA/
├── docker/                 # compose + nginx/php configs
├── moodle/                 # Moodle 4.5 core (gitignored; clone via script)
├── theme/kadsamhsa/        # working copy → sync to moodle/theme/kadsamhsa/
├── plugins/                # customcert, enrol_paystack, local_orgs
├── content/dptc/           # DPTC source materials (Phase 4)
├── config/                 # .env.example, versions.md
├── docs/                   # runbooks (see docs/local-bootstrap.md)
└── scripts/                # clone, install, sync, cron helpers
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
