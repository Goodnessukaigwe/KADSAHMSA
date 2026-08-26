# Archived prototype

This folder is the **Moodle 4.5 LTS demo** and the deprecated Fastify/Vite monorepo. It is **not** the production runtime.

Active product: Next.js + Supabase at the repository root. See [`PHASES_v2.md`](../PHASES_v2.md) and [`(New)KADSAMHSA_LMS_PRD_v2.md`](../(New)KADSAMHSA_LMS_PRD_v2.md).

## What is in here

| Path | Role |
|------|------|
| `theme/kadsamhsa/` | Figma-backed Moodle theme (learner UX reference) |
| `plugins/` | customcert, enrol_paystack, local_orgs |
| `docker/` | Local + VPS compose for the Moodle demo |
| `scripts/` | Moodle clone / install / sync / prod helpers |
| `docs/` | Moodle local bootstrap and VPS deploy runbooks |
| `PHASES.md` | Historical Moodle build checklist |
| `KADSAMHSA_LMS_PRD_v1.md` | PRD v1 (Moodle stack) |
| `kadsamhsa-platform/` | Deprecated Fastify/Vite app — domain-model reference only |
| `moodle/` | Moodle core clone (gitignored; recreate with `scripts/clone-moodle.sh` if needed) |

## Running the Moodle demo (optional)

From this `prototype/` directory the old paths in `docs/local-bootstrap.md` still apply, with `config/`, `docker/`, and `scripts/` as siblings here rather than at the repo root.

```bash
cd prototype
cp config/.env.example .env
./scripts/clone-moodle.sh
./scripts/fetch-plugins.sh
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
./scripts/install-moodle.sh
./scripts/sync-theme.sh
./scripts/sync-plugins.sh
```
