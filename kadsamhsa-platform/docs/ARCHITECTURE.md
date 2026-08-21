# Architecture

## Decision

Replace Moodle/PHP with a dedicated platform. React is the learner and admin
interface; a TypeScript API owns authentication, permissions, learning state,
payments, certificates, and reporting. Moodle is retained read-only until its
data has been validated and migrated.

This is not a PHP-to-JSX translation. The PHP controllers, Mustache templates,
and Moodle plugins bundle server-side security and business rules — enrolment
eligibility, quiz scoring, certificate issuance, payment state — that must move
into an API before the PHP runtime can be retired.

## Target shape

```
Browser
  └─ apps/web        React 19 + TypeScript + Vite
       ├─ public learner experience
       └─ role-based learner, organisation and staff portals

apps/api             TypeScript + Fastify
  ├─ REST API + OpenAPI contract
  ├─ authentication and role-based access control
  ├─ course, lesson, quiz and completion rules
  ├─ Paystack webhook validation and payment reconciliation
  ├─ certificate verification and PDF issuance
  └─ audit logging and CSV exports

PostgreSQL           transactional application data
Redis                background jobs, rate limiting, short-lived caches
S3-compatible store  course media, attachments, generated certificates
apps/worker          email, media processing, certificates, report exports
```

PostgreSQL is modelled on the product rather than carried over from Moodle's
MariaDB schema. The browser never reaches the database and never holds a payment
or storage secret.

## Roles and permissions

| Role | Capabilities |
|---|---|
| Learner | Register, enrol, learn, take assessments, download own certificates and receipts. |
| Organisation admin | Invite/import staff, allocate seats, view only their organisation's progress, export reports. |
| Content admin | Create, preview, publish and manage courses, lessons, quizzes, certificate templates. |
| Super admin | Manage users, organisations, offers, payments, branding, reporting, administrative roles. |
| Public verifier | Submit a certificate ID; receives only validity, learner name, course, issue date. |

Every protected endpoint enforces both a signed-in identity and an explicit
permission check — see `packages/domain/src/permissions.ts`, which is the single
source of truth shared by the API and the web client. The client uses it to hide
controls; the API uses it to refuse requests. Only the API's check is
load-bearing.

Administrative changes and payment/certificate transitions are written as
immutable `audit_events`.

## Domain model

| Area | Main records |
|---|---|
| Identity | `users`, `password_credentials`, `sessions`, `roles`, `user_roles`, `consents` |
| Catalogue | `courses`, `course_categories`, `course_tags`, `modules`, `lessons`, `content_blocks`, `assets` |
| Learning | `enrolments`, `lesson_progress`, `course_progress`, `quiz_attempts`, `quiz_answers`, `question_banks`, `questions` |
| Commerce | `offers`, `offer_courses`, `orders`, `payments`, `payment_events`, `coupons`, `organisation_seats` |
| Organisations | `organisations`, `organisation_memberships`, `organisation_invites`, `bulk_imports` |
| Certification | `certificate_templates`, `certificates`, `certificate_revocations` |
| Operations | `notifications`, `email_deliveries`, `report_exports`, `audit_events` |

Tables landed so far are in `apps/api/migrations`. Commerce and quiz tables are
scheduled for M3/M4.

## Certification rules

From PRD §7.3. Issuance is idempotent: once every required learning item is
complete and the final assessment reaches the configured pass mark (default
70%), a worker creates one non-guessable verification ID, renders one PDF,
stores it privately, and records the issue event. Re-running the check for an
already-certified enrolment is a no-op.

Public verification returns validity, learner name, course title, and issue
date — nothing else. Revocation changes public status without exposing
additional personal data.

## Security baseline

- Argon2id password hashing; short-lived access tokens; rotating refresh-token
  sessions; password-reset throttling; email verification.
- HTTPS, secure HTTP-only cookies, CSRF protection, content security policy,
  request validation, upload type/size checks, signed object-store URLs.
- Paystack webhook signature verification and idempotency keys. Payment status
  changes only from a verified gateway event or an audited staff action.
- Daily encrypted database backups, object-storage versioning, restore drills,
  monitoring, error tracking, structured audit logs.
- NDPA consent capture, retention rules, data export/deletion workflow, and
  public certificate lookup limited to the fields above.

## Environment boundaries

`apps/web` reads only `VITE_*` values, which may contain public API origins and
nothing else. A Paystack secret, SMTP credential, storage secret, or Moodle
web-service token in a `VITE_*` variable is shipped to every visitor's browser.
Server-side configuration is validated at boot in `apps/api/src/config.ts`; the
API refuses to start on a missing or default-valued secret outside development.
