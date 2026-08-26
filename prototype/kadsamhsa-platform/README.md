# KADSAMHSA Platform

React learner and admin experience over a TypeScript API. Replaces the Moodle/PHP
build in `../KADSAHMSA`, which is retained read-only until its data is migrated
and validated.

**Stack:** React 19 + Vite (web) · Fastify + TypeScript (API) · PostgreSQL 16 ·
Redis 7 · S3-compatible object storage.

> **Note for approval:** the PRD (§8) recommends a customised Moodle. This repo
> implements the agreed replacement direction instead. That deviation, and the
> data-migration policy in [docs/MIGRATION.md](docs/MIGRATION.md), need KADSAMHSA
> sign-off before cutover.

## Layout

```
apps/
  web/               React client (public site today, learner + admin portals next)
  api/               Fastify API — auth, RBAC, catalogue, learning, audit
  worker/            Async jobs — email, certificates, report exports
packages/
  domain/            Shared types, permissions, Zod validation
  api-contract/      Typed API client consumed by apps/web
  ui/                Reusable accessible React components
infra/docker/        Local + production service definitions
docs/                Architecture, migration blueprint, roadmap
```

## Quick start

```bash
cp .env.example .env
npm install
docker compose -f infra/docker/docker-compose.yml up -d
npm run migrate
npm run seed
```

Then run the two processes:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

| Service | URL |
|---------|-----|
| Web | http://localhost:5180 |
| API | http://localhost:4000 |
| Mailpit | http://localhost:8026 |
| Postgres | localhost:5433 |

Ports are deliberately offset from the Moodle stack's so both can run at once
during migration.

## Where things stand

| Milestone | Status |
|-----------|--------|
| M1 Foundation — API, migrations, auth, RBAC, audit log, Docker stack | Built |
| M2 Public + learner — catalogue, registration, enrolment, dashboard | Vertical slice built; course player outstanding |
| M3 Assessment + certification | Schema and verification endpoint only |
| M4 Operations — admin builder, offers, Paystack | Not started |
| M5 Organisations | Schema only |
| M6 Migration + launch | Blueprint only — see docs/MIGRATION.md |

Detail in [docs/ROADMAP.md](docs/ROADMAP.md).

## Security baseline

Argon2id password hashing, short-lived access tokens with rotating refresh
sessions, RBAC enforced on every protected route, and immutable audit events for
administrative and payment/certificate transitions. Secrets stay server-side:
`apps/web` may only receive public origins. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
