# Backups and restore drill

KADSAMHSA staff or a designated operator run these steps. This is a runbook, not a completed drill log.

Project: [ujhjdqijrylcwihxpdpa](https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa). Recovery point target from the PRD is **≤ 24 hours**.

## What Supabase already keeps

1. Open [Project settings → Database](https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/settings/database).
2. Confirm **daily backups** are on (all paid projects). Free-tier projects may only have a short window — upgrade before launch if you need a 24h RPO.
3. If the plan includes **Point-in-Time Recovery (PITR)**, note the retention days. PITR is the preferred restore path for a mistaken delete.

Storage buckets (`certificates`, `course-media`) are not inside a `pg_dump`. After a database restore, confirm objects still exist in Storage, or restore Storage from the dashboard backup if your plan includes it.

## Manual `pg_dump` (pooler)

Use the **session** pooler URI from [Project settings → Database](https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/settings/database) (port `5432` session mode, not transaction mode). Do not commit the password.

```bash
# Replace with the session-pooler URI from the dashboard.
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --file "kadsamhsa-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Store the file off the laptop that created it (encrypted volume or KADSAMHSA’s backup store). A dump without Storage objects is not a full platform backup.

Optional schema-only copy for review:

```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --file kadsamhsa-schema.sql
```

## Restore drill (you run this)

Pick a **non-production** project or a disposable branch. Do not point a drill at live learners.

### A. PITR / dashboard backup

1. Dashboard → Database → Backups.
2. Restore to a new project (or the documented PITR timestamp).
3. Point a local `.env.local` at the restored project (new URL and keys).
4. Sign in as a test learner. Confirm: one enrolment, one quiz attempt, one certificate ID still verifies, one lesson asset still plays.

### B. `pg_dump` restore

```bash
# New empty database / restore project only.
pg_restore --clean --if-exists --no-owner \
  --dbname "$RESTORE_DATABASE_URL" \
  kadsamhsa-YYYYMMDDThhmmssZ.dump
```

Then repeat the four checks in A.4. Auth users live in `auth.*`; if the dump omitted Auth, recreate a test user and expect enrolments that reference missing `auth.users` ids to fail — that is the drill finding, not a product bug.

## After a real incident

1. Freeze writes if the live app is still up (maintenance page or pause the Vercel deployment — when a domain exists).
2. Restore the newest good backup or PITR timestamp.
3. Re-apply any SQL pasted after that backup (`apply-phase7.sql`, [`apply-production-cleanup.sql`](../supabase/apply-production-cleanup.sql), [`apply-enrol-requests.sql`](../supabase/apply-enrol-requests.sql), and later).
4. Record the actual RPO (time between last good backup and the incident) in the handover notes.

There is no automated monthly backup report in this slice. Phase 10 can add that under the support SLA.
