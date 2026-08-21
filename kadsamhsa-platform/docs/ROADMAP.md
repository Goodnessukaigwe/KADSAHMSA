# Delivery sequence

Each milestone is accepted on staging before the next starts. The course
builder, payment gateway, certificate flow, and organisation reporting are
separate high-risk acceptance paths — none is deferred to a final integration
phase.

| Milestone | Outcome | Status |
|---|---|---|
| M1 Foundation | API, database migrations, typed API contract, secure email/password auth, RBAC, audit log, CI and local Docker stack. | Built |
| M2 Public and learner | Live catalogue/detail pages, registration/login, enrolment, learner dashboard, course player, resumable lesson progress. | Catalogue, auth, enrolment, dashboard built; player outstanding |
| M3 Assessment and certification | Quiz/question bank flows, scoring/retries, completion rules, PDF certificates, public verification. | Schema + verification endpoint |
| M4 Operations | Admin course builder, assets, publish/preview, offers, Paystack checkout/webhooks, notifications, reports. | Not started |
| M5 Organisations | Organisation onboarding, CSV staff import, invites, seat allocation, dashboards/exports. | Schema only |
| M6 Migration and launch | Validated data import, performance/security testing, pilot, cutover, runbooks, handover. | Blueprint only |

## First implementation scope (done)

M1 plus one vertical learner slice, proving the React/API/data boundary before
committing to the quiz, payment, and certificate engines:

- Public course catalogue backed by `GET /courses`
- Authenticated enrolment via `POST /courses/:id/enrolments`
- Learner dashboard reading `GET /me/dashboard`

## Next

1. **Course player + lesson progress** (M2) — `GET /courses/:slug/outline`,
   `PATCH /lessons/:id/progress`. The largest remaining learner-facing gap.
2. **Quiz engine** (M3) — question banks, attempts, scoring, retry limits.
   Certificate issuance depends on it and it is the highest-risk unbuilt area.
3. **Admin course builder** (M4) — the PRD's self-management principle (§1)
   fails without it; KADSAMHSA cannot publish a course until it exists.

## Traceability to PRD requirements

| PRD | Requirement | Where |
|---|---|---|
| F1 | Public catalogue, browsable without login | `apps/web/src/pages/Courses.tsx`, `GET /courses` |
| F2 | Course detail page | `apps/web/src/pages/CourseDetail.tsx`, `GET /courses/:slug` |
| F3 | Registration, login, password reset | `POST /auth/register`, `/auth/login`; reset outstanding |
| F4 | Course player, resume | Outstanding |
| F5 | Quizzes, pass mark, retries | Outstanding — schema in M3 |
| F6 | PDF certificate | Outstanding — worker stub in `apps/worker` |
| F7 | Public verification page | `GET /certificate-verifications/:id` |
| F8 | Learner dashboard | `apps/web/src/pages/Dashboard.tsx`, `GET /me/dashboard` |
| F9 | Paystack checkout | Outstanding |
| F10 | Email notifications | Outstanding — worker stub |
| F11 | Responsive, low-bandwidth | Carried over from the theme SCSS |
