# KADSAMHSA LMS — Build Phases Checklist (v2)

> **Active contract / product baseline:** [(New)KADSAMHSA_LMS_PRD_v2.md](./(New)KADSAMHSA_LMS_PRD_v2.md)  
> **Supersedes:** [prototype/PHASES.md](prototype/PHASES.md) (Moodle LTS checklist) and [prototype/KADSAMHSA_LMS_PRD_v1.md](prototype/KADSAMHSA_LMS_PRD_v1.md) §8 stack  
> **Locked stack:** Next.js 15 (App Router) + TypeScript · Supabase (Postgres + Auth + Storage + RLS) · Tailwind + shadcn/ui · Paystack (deferred to the last product phase) · Resend · Inngest (or Supabase cron) · Vercel (or similar)  
> **End-state:** Staging UAT → production on KADSAMHSA domain → DPTC course live → training & handover  
> **Self-management principle:** KADSAMHSA staff run courses, users, orgs, pricing, and certificates in-app after handover — no engineer for routine ops

**Build order vs PRD:** The PRD (v2 §10 / §13) is **unchanged**. This file only sequences engineering: **Paystack is last** (Phase 9 here) so the admin builder, organizations, DPTC content, UAT, and handover can ship without checkout. PRD still names Paystack in its Phase 4; that is not a contract change.

---

## What this file is

This is the **implementation phases checklist** for the **new** product build (PRD v2 §8 / §10).

It is **not** the Moodle prototype checklist. The Moodle theme demo (`prototype/theme/kadsamhsa/`, Docker Moodle, plugins) is a **UX/reference prototype** only.

| Document | Role |
|----------|------|
| `(New)KADSAMHSA_LMS_PRD_v2.md` | Product + contract requirements (source of truth) |
| `PHASES_v2.md` (this file) | Build checklist, acceptance gates, repo plan |
| `prototype/PHASES.md` | Historical Moodle phases — archived |
| `prototype/kadsamhsa-platform/` | Deprecated Fastify/Vite monorepo — reference domain model only |

---

## Target directory layout (after Phase 0)

```
KADSAHMSA/
├── PHASES_v2.md                 # this file
├── (New)KADSAMHSA_LMS_PRD_v2.md # product PRD v2
├── README.md                    # points at v2 stack + quick start
├── prototype/                   # archived Moodle / Docker / theme demo (read-only reference)
│   ├── docker/
│   ├── moodle/                  # if kept locally; often gitignored
│   ├── theme/
│   ├── plugins/
│   ├── scripts/
│   ├── PHASES.md                # old Moodle checklist
│   └── KADSAMHSA_LMS_PRD_v1.md
├── app/                         # Next.js App Router
├── components/
├── lib/
│   ├── supabase/
│   ├── permissions.ts
│   └── domain/
├── supabase/
│   ├── migrations/
│   └── policies/
├── public/
├── content/dptc/                # DPTC source PPT/PDF (unchanged purpose)
├── docs/                        # runbooks, admin manual stubs, handover
└── package.json                 # Next.js app at repo root
```

**Convention:** one Next.js app at the **repository root** (not `apps/web` + `apps/api` until it hurts). Moodle and the old monorepo live under `prototype/` as legacy reference only.

---

## Prerequisites / decisions (from PRD §12)

- [ ] Branding assets (logo SVG/PNG, colors, fonts) or brand guide
- [ ] Production domain name confirmed
- [ ] Vercel (or similar) + Supabase account owner (KADSAMHSA vs vendor)
- [x] Payment gateway: **Paystack** locked (build deferred to Phase 9)
- [ ] Launch pricing (DPTC assumed free; paid courses TBD)
- [ ] Quiz question bank authorship (KADSAMHSA SMEs vs vendor draft)
- [ ] Certificate signatories, wording, logos; UNODC/EU co-branding / online rights
- [ ] NDPA privacy policy text and compliance owner
- [ ] Pilot organization identified for UAT

---

## Tech stack lock-in (PRD §8)

- [x] Next.js **15** App Router + TypeScript
- [x] Supabase: Postgres + Auth + Storage + **RLS**
- [x] Tailwind CSS + **shadcn/ui**
- [ ] Paystack (card / transfer / USSD) — **deferred to Phase 9** (last product phase)
- [ ] Resend (or similar) for transactional email
- [ ] Inngest **or** Supabase cron for cert PDF / email / exports (no Redis day one)
- [ ] Hosting: Vercel (or similar) for app; Supabase for data
- [ ] Environments: local → staging → production

**Explicitly out of stack:** Moodle, PHP, Mustache, MariaDB-as-app-DB, Vite SPA + Fastify, Redis as day-one dependency.

**Security:** never put Paystack secret, Supabase service-role, Resend, or webhook secrets in `NEXT_PUBLIC_*`.

**Permissions:** dual-check — Supabase RLS **and** server-side checks on Server Actions / Route Handlers (server is load-bearing).

---

## Phase 0 — Prototype archive + Next.js bootstrap

> **Goal:** Clear the root for the real product app without losing the Moodle/Figma demo work.

**Status:** shipped.

### 0.1 Pack legacy into `prototype/`

Move (or relocate under `prototype/`) everything that is Moodle / Docker demo / old stack, for example:

- [x] `docker/`, `theme/`, `plugins/`, `scripts/` (Moodle sync/install)
- [x] `moodle/` (if present; still gitignored as needed)
- [x] `PHASES.md`, `KADSAMHSA_LMS_PRD_v1.md` (historical)
- [x] `kadsamhsa-platform/` (optional: keep as `prototype/kadsamhsa-platform/` for domain-model reference)
- [x] Old deploy docs that describe only Moodle VPS (or leave a short pointer in root `docs/`)

Keep at root: PRD v2, this `PHASES_v2.md`, `content/dptc/`, and (after scaffold) the Next.js tree.

- [x] Root `README.md` updated: “Active build = Next.js + Supabase; Moodle demo = `prototype/`”

### 0.2 Initialize Next.js at repo root

- [x] `create-next-app` (App Router, TypeScript, Tailwind, ESLint, App directory)
- [x] Add shadcn/ui
- [x] Add `@supabase/supabase-js` + `@supabase/ssr`
- [x] Env samples: `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only placeholders
- [x] Folder stubs matching PRD §8.5: `(public)`, `(auth)`, `(learner)`, `(org)`, `(admin)`, `api/`
- [x] `supabase/` migrations + policies folders
- [x] Local run documented in README (`npm run dev`)

### 0.3 Carry forward from the Moodle prototype (knowledge, not code)

Use the Figma-backed student flow already proven in the theme demo as UX reference:

| Prototype screen / flow | Maps to v2 |
|-------------------------|------------|
| Landing, About, public Courses | F1 public catalogue / landing |
| Login / Signup | F3 auth |
| Student home `/my/` | F8 learner dashboard |
| My Courses → course detail → play | F2, F4 |
| Text vs video course delivery | F4 content blocks (text / video) |
| Module quiz + result modal | F5 |
| Quiz results list | F8 progress / assessments |
| Assets: `kadsamhsa.svg`, `Course.png`, `signin.png` | seed `public/` / design tokens |

**Done when:** root is a runnable Next.js app; legacy Moodle demo is under `prototype/`; README states v2 as active.

---

## Phase 1 — Foundation (design + scaffold)

**PRD §10 Phase 1 · ~3–4 weeks**

**Status:** engineering scaffold shipped locally. Formal design sign-off and hosted staging are still open.

### Design

- [ ] Sitemap and user flows (learner, org, admin)
- [ ] Wireframes then hi-fi (desktop + mobile) for: landing, catalogue, course detail, auth, player, quiz, certificate, learner dashboard, org dashboard, admin course builder, verification page
- [ ] Clickable prototype
- [x] Mini design system in use (Tailwind + shadcn tokens; WHO Academy learner / Gurucan admin as reference)

### Engineering

- [ ] Staging on Vercel (or similar)
- [x] Supabase project: Postgres, Auth (email/password), Storage, RLS skeleton
- [x] Dual-check permissions module (`lib/permissions.ts` + RLS policies)
- [x] Env/secrets layout validated (no secrets in `NEXT_PUBLIC_*`)
- [x] Role layouts: public / auth / learner / org / admin shells

**Acceptance:** KADSAMHSA signs off designs vs PRD §4 and §6. Staging boots with Auth + RLS; no secrets in client env.

**Maps to:** Design system; F3 scaffolding; F11 responsive shell

---

## Phase 2 — Learner

**PRD §10 Phase 2 · ~3–4 weeks**

**Status:** shipped on the current build (free enrolment / staff enrol; no checkout).

- [x] F1 — Public landing + catalogue (SSR), search/filters, cards
- [x] F2 — Course detail (overview, objectives, outline, duration, cert info, Enrol CTA)
- [x] F3 — Register / login / password reset (email; phone = P1 later)
- [x] F4 — Course player: module/lesson nav, content blocks, mark complete, progress, resume (text lessons; media uploads in Phase 6)
- [x] F8 — Learner dashboard: my courses, progress, certificates entry, payment history **shell** (live receipts wait for Phase 9)
- [x] F11 — Mobile + low-bandwidth basics on catalogue and lesson pages

**Acceptance:** F1, F2, F3 (email), F4, F8, F11 on staging with a sample course.

---

## Phase 3 — Assessment & certificates

**PRD §10 Phase 3 · ~2–3 weeks**

**Status:** DPTC path shipped (module quiz, final, PDF, verify, revoke). Transactional email skipped. Any-course quiz/cert is Phase 4b.

- [x] F5 — Module quizzes + final assessment (score, pass mark default 70%, retries, feedback) — DPTC banks in TypeScript
- [x] F6 — Auto PDF certificate (name, course, date, unique non-guessable ID, logos/signatories)
- [x] F7 — Public verify page (ID entry; QR = P1)
- [ ] F10 — Emails: completion + certificate issued (skipped; Resend not wired)
- [x] §7.3 rules: idempotent issue; revoke support; verify exposes only validity, name, course, date
- [x] Private Storage for PDFs; verify URL is not a file listing

**Acceptance:** §7.3 example met (complete modules + ≥70% final → PDF + ID within ~1 minute; verify returns valid).

---

## Phase 4 — Admin builder

**PRD §10 Phase 4 · ~3–4 weeks** (PRD also lists Paystack here; **this build defers Paystack to Phase 9**)

**Status:** A1 persist and staff enrol-by-email / user-detail enrol are shipped. A2 lesson media is in Phase 6. Full quiz-builder types, cert template editor, and catalogue/offers metadata are leftover.

- [x] A1 — Gurucan-style course builder persist (Save / Preview / Publish / Delete; shareable URL)
- [x] Staff enrol a registered learner (user detail + enrol-by-email on the builder)
- [x] A2 — Content blocks: PPTX/PDF, video (upload or YouTube/Vimeo), image, audio, rich text, downloads (Phase 6)
- [ ] A3 — Quiz builder: MCQ, T/F, matching; banks; randomization; pass mark / attempts / time (thin MCQ-only final is Phase 4b)
- [ ] A4 — Certificate template editor per course
- [ ] A5 — Catalogue categories/tags/featured; free offers (paid offers wait for Phase 9)

F9 Paystack and payment-receipt emails are **not** in this phase.

**Acceptance:** Content admin publishes a course unassisted on staging. **No webhook.**

---

## Phase 4b — Course roster + any-course assessment

> Leftover from Phase 4. No Paystack. No org bulk CSV (Phase 5).

**Status:** shipped. Apply [`supabase/apply-phase4b.sql`](supabase/apply-phase4b.sql) if the SQL editor has not run it yet.

- [x] Per-course **Learners** roster on `/admin/courses/[slug]`: all registered learners; **Enrol** or **Enrolled** + progress
- [x] Manual enrol from that roster (reuse staff enrol; keep enrol-by-email as a second path)
- [x] Final quiz + certificate for **any published course** (not only DPTC): all live lessons complete and final ≥70% → one PDF, unique `KAD-` id, idempotent on `enrolment_id`
- [x] Builder: thin MCQ final bank (pass mark 70, max 3 attempts). DPTC Module 1 + final banks stay in TypeScript; other courses use DB questions
- [x] Player links to `/final` when a final quiz exists; honest copy and no cert when it does not

**Acceptance:** Staff enrol a registered user onto a course from the roster; that learner completes live lessons, passes the final, and receives one verifiable certificate. DPTC Module 1 / final / existing `KAD-` ids still work.

---

## Phase 5 — Organizations

**PRD §10 Phase 5 · ~2–3 weeks**

**Status:** shipped locally. Paste [`supabase/apply-phase5.sql`](supabase/apply-phase5.sql) in the SQL editor after 4b. Seat limit is a staff-set integer (not paid seats). No Paystack, no emails.

- [x] A6 — CRM-style users; roles; org approve/view
- [x] A7 — Org bulk enrol (CSV + invite link/code); seat allocation
- [x] A8 — Reports (enrolments, progress, completions, quizzes, certs) + CSV export. **Revenue is omitted until Phase 9 Paystack exists.**
- [x] Org dashboard for org admins (staff progress only)

**Acceptance:** Org admin sees only their staff; RLS + server checks refuse cross-org access.

---

## Phase 6 — DPTC content

**PRD §10 Phase 6 · ~3–4 weeks (can overlap 4–5)**

**Status:** A2 lesson media shipped locally. Paste [`supabase/apply-phase6.sql`](supabase/apply-phase6.sql) in the SQL editor after Phase 5. **DPTC slide/quiz-bank authoring is deferred** — staff attach files and YouTube/Vimeo URLs through the course builder when assets are ready. Do not invent Module 2–12 questions.

- [x] A2 — Lesson media: PDF/PPTX, video (file or YouTube/Vimeo), image, audio — private `course-media` bucket, signed playback for enrolled learners or staff
- [ ] Intro module + modules 1–12 (slides as lesson content) — **deferred**; staff upload through the builder
- [ ] Module quizzes + final assessment (from approved question banks) — Module 1 + final stay in TypeScript; do not invent banks 2–12
- [ ] Certificate template for DPTC
- [ ] Trainer Resource Manual (236 pp. PDF) as downloadable resource — attach via the builder when you have the file (not a separate course)

**Acceptance:** Staff attach media on a lesson; enrolled learners play or download via signed URLs; unenrolled cannot. DPTC text + Module 1 / final still work. Full DPTC slide review waits until remaining assets are authored.

---

## Phase 7 — UAT & launch

**PRD §10 Phase 7 · ~2–3 weeks**

**Status:** harden slice shipped locally (privacy draft, consent, headers, 375px pass, runbooks). Paste [`supabase/apply-phase7.sql`](supabase/apply-phase7.sql) after Phase 6. Privacy text is a **draft until legal signs off**. Production DNS and staff/pilot UAT remain open.

- [x] Cross-device + low-bandwidth testing
- [x] Security checklist (HTTPS, OWASP intent, NDPA consent/privacy)
- [ ] UAT with KADSAMHSA staff + pilot org
- [ ] Bug fixes; production on KADSAMHSA domain
- [x] Backups + restore drill documented

**Acceptance:** UAT sign-off; every **P0** in PRD §7 on production **except F9 / paid checkout** (Phase 9); zero open critical/major defects.

---

## Phase 8 — Handover

**PRD §10 Phase 8 · ~1–2 weeks**

- [ ] Admin training (content admin + super admin), recorded
- [ ] Admin manual
- [ ] Credentials, source, Supabase access, docs handed over
- [ ] Staff publish a **test course unassisted** (self-management gate)

---

## Phase 9 — Paystack

**Last product phase.** PRD §10 lists this work under its Phase 4; this file sequences it after handover so the rest of the product can ship without checkout.

- [ ] F9 — Paystack checkout (card, transfer, USSD); webhook signature verified; secrets server-only
- [ ] A5 — Paid offers (and seat bundles that depend on checkout)
- [ ] Learner payment history (replace the Phase 2 shell)
- [ ] F10 — Payment receipt emails

**Acceptance:** Paid enrolment on staging: checkout → verified webhook → enrolment + receipt. Secrets never in `NEXT_PUBLIC_*`.

---

## Phase 10 — Support & maintenance

**PRD §10 Phase 9 · separate SLA** (renumbered here because Paystack is the last product phase)

- [ ] Warranty period (suggest 3 months post-launch)
- [ ] Optional annual support / hosting SLA
- [ ] Monthly uptime / backup reports

---

## P0 requirement index (quick map)

| ID | Area | Phase (this file) |
|----|------|-------------------|
| F1–F4, F8, F11 | Learner public + player + dashboard | 2 |
| F5–F7, F10 (cert emails) | Quiz + cert + verify | 3 |
| A1–A4, A5 (catalogue / free offers) | Admin builder | 4 |
| Per-course roster; any-course quiz/cert | Course roster + assessment | 4b |
| A6–A8 (no revenue until Paystack) | Orgs + CRM + reports | 5 |
| Section 5 | DPTC content | 6 |
| All P0 except F9 / paid checkout | Production | 7 |
| F9, A5 paid offers, payment history, receipt emails | Paystack | 9 |

**P1 (fast follow unless pulled in writing):** F3 phone, F7 QR, F12 ratings, A9–A13  
**P2 (out of contract unless quoted):** F13–F14, A14–A16

---

## Domain model starter (PRD §8.4)

Implement as Supabase migrations (names may adapt to Auth identities):

| Area | Tables (starting set) |
|------|------------------------|
| Identity | users / auth identities, roles, user_roles, consents |
| Catalogue | courses, course_categories, course_tags, modules, lessons, content_blocks, assets |
| Learning | enrolments, lesson_progress, course_progress, quiz_attempts, quiz_answers, question_banks, questions |
| Commerce | offers, offer_courses, orders, payments, payment_events, coupons, organisation_seats |
| Organisations | organisations, organisation_memberships, organisation_invites, bulk_imports |
| Certification | certificate_templates, certificates, certificate_revocations |
| Operations | notifications, email_deliveries, report_exports, audit_events |

Reference (legacy): `kadsamhsa-platform/docs/ARCHITECTURE.md` — product logic, not the runtime.

---

## Suggested demo path (product, post Phase 2+)

Same learner story as the Moodle prototype, re-implemented in Next.js:

1. Public landing / catalogue  
2. Sign up / log in  
3. Learner home → My courses  
4. Course detail → player (text and/or video lessons)  
5. Module quiz → result  
6. Final assessment → certificate → public verify  

Staff path (Phase 4 / 4b): publish a course → enrol a registered learner from the course roster → learner completes lessons and final → cert verifies.

Paid checkout is **not** on this path until Phase 9.

---

## Indicative timeline (PRD §13)

PRD §13 durations are unchanged. This table is the **engineering sequence** (Paystack last, not in Phase 4).

| Phase | Weeks (indicative) |
|-------|--------------------|
| 0 Prototype archive + Next.js bootstrap | 0.5–1 |
| 1 Foundation | 3–4 |
| 2 Learner | 3–4 |
| 3 Assessment & certificates | 2–3 |
| 4 Admin builder | 3–4 |
| 4b Course roster + any-course assessment | leftover slice of Phase 4 |
| 5 Organizations | 2–3 |
| 6 DPTC content | 3–4 (overlap OK) |
| 7 UAT & launch | 2–3 |
| 8 Handover | 1–2 |
| 9 Paystack (last product phase) | from PRD Phase 4 remainder |
| 10 Support & maintenance | separate SLA |

**Total (PRD phases 1–8):** roughly **3.5–4.5 months** from contract signature, assuming prompt reviews and assets on schedule. Phase 0 is engineering prep before or at kickoff. Phase 9 Paystack is sequenced after handover in **this** file; it does not rewrite the PRD.

---

## Next concrete engineering step

**Phase 7 remainder:** apply [`supabase/apply-phase7.sql`](supabase/apply-phase7.sql) if `consents` is missing, then [`supabase/apply-enrol-requests.sql`](supabase/apply-enrol-requests.sql) so learners request a seat and leftover verify courses stay unpublished. Legal still owes NDPA policy sign-off. Staff + pilot org walk [`docs/uat-script.md`](docs/uat-script.md) before checking UAT. Production on the KADSAMHSA domain waits on DNS.

Do not start Paystack, a tutor role, or remaining F10 emails in this slice. Phase 8 is handover (admin manual, recorded training).
