# KADSAMHSA LMS — Build Phases Checklist

> **Locked stack:** Moodle LTS + custom theme (`kadsamhsa`) + plugins (certificates, orgs/cohorts, Paystack/Flutterwave)
> **UI source:** Figma → implement as Moodle theme (Mustache + CSS/JS); no separate design phase
> **End-state:** Staging UAT → production on KADSAMHSA domain → DPTC course live → training & handover complete
> **Scope baseline:** [KADSAMHSA_LMS_PRD_v1.md](KADSAMHSA_LMS_PRD_v1.md) P0 requirements

---

## Target directory layout

```
KADSAHMSA/
├── PHASES.md
├── KADSAMHSA_LMS_PRD_v1.md
├── README.md
├── docker/                    # local Moodle + DB (compose, Dockerfiles if needed)
├── moodle/                    # Moodle core (or git submodule / vendor mount)
├── theme/kadsamhsa/           # custom theme — working copy; sync to moodle/theme/kadsamhsa/
├── plugins/                   # local plugin forks/patches if needed
├── content/dptc/              # source PPT/PDF + conversion notes for launch course
├── config/                    # env samples, nginx/php notes, cron, backup scripts
├── docs/                      # admin manual stubs, runbooks, handover
└── scripts/                   # install, migrate, seed, deploy helpers
```

- [x] Convention documented: develop theme in `theme/kadsamhsa/`, sync/deploy to `moodle/theme/kadsamhsa/`

---

## Prerequisites / decisions

- [ ] Branding assets exported from Figma (logo SVG/PNG, colors, fonts)
- [ ] KADSAMHSA brand guide confirmed (or Figma tokens accepted as source of truth)
- [ ] Production domain name confirmed
- [ ] Hosting account owner identified (KADSAMHSA vs vendor)
- [x] Payment gateway chosen: Paystack **or** Flutterwave — **Paystack** locked
- [ ] Launch pricing decided (DPTC assumed free; paid courses TBD)
- [ ] Quiz question bank authorship assigned (KADSAMHSA SMEs vs vendor draft for approval)
- [ ] Certificate signatories, wording, and logos approved
- [ ] UNODC/EU co-branding and online publishing rights confirmed for DPTC materials
- [ ] NDPA privacy policy text and compliance owner assigned
- [ ] Pilot organization identified for UAT

---

## Tech stack lock-in

- [x] Moodle LTS version pinned (document in `config/`) — Moodle **4.5 LTS** (`MOODLE_405_STABLE`), see `config/versions.md`
- [x] PHP version compatible with pinned Moodle LTS — **PHP 8.2**
- [x] Database: MariaDB or PostgreSQL version pinned — **MariaDB 10.11**
- [x] Web server: nginx + PHP-FPM (or Apache) documented — nginx + PHP-FPM in `docker/`
- [x] Theme name locked: `kadsamhsa`
- [x] Certificate plugin: Custom Certificate + public verification — `mod_customcert`
- [x] Org/cohort plugin: IOMAD **or** cohorts + local org plugin — **cohorts + `local_orgs`** (not IOMAD)
- [x] Payment plugin: Paystack **or** Flutterwave (match gateway decision) — **Paystack** (`enrol_paystack`)
- [x] Environments defined: local (Docker) → staging → production — local Docker documented; staging/prod TBD Phases 5–6
- [ ] SMTP provider for transactional email chosen — local **Mailpit** for Phase 0; production SMTP TBD Phase 2/6

---

## Repo & directories

- [x] Create `docker/`
- [x] Create `moodle/` (core install path or submodule)
- [x] Create `theme/kadsamhsa/`
- [x] Create `plugins/`
- [x] Create `content/dptc/`
- [x] Create `config/`
- [x] Create `docs/`
- [x] Create `scripts/`
- [x] Add `config/.env.example` (DB, SMTP, gateway keys placeholders)
- [x] Add `.gitignore` (secrets, `.env`, Moodle `moodledata/`, vendor if applicable)
- [x] Update `README.md` with directory map and quick-start pointer

**Done when:** repo skeleton exists; `.env.example` and `.gitignore` committed; README points to this file.

---

## Phase 0 — Local platform bootstrap

- [x] `docker-compose.yml` in `docker/` — Moodle + MariaDB/Postgres
- [x] Moodle core installed and reachable at local URL
- [x] Admin account created; credentials stored securely (not in repo)
- [x] Cron configured (Moodle scheduled tasks)
- [x] File storage / `moodledata` volume mapped and documented
- [x] Theme `kadsamhsa` registered and activatable
- [x] Required plugins installed from `plugins/` or Moodle directory
- [x] Local smoke test: login, create test course, upload file

**Done when:** local Moodle runs in Docker; admin can log in; cron fires; theme and plugins install without errors.

---

## Phase 1 — UI integration (Figma → theme)

Design phase skipped — Figma is source of truth. Implement directly into `theme/kadsamhsa/`.

### Design tokens & base theme

- [ ] Colors, typography, spacing tokens from Figma → SCSS/CSS variables
- [ ] Base Mustache layouts: header, footer, nav, mobile menu
- [ ] Responsive breakpoints (mobile-first; Nigerian smartphone target)
- [ ] Low-bandwidth asset strategy (compressed images, lazy load, minimal JS)

### Learner screens (PRD F1–F8, F11)

- [ ] Public landing page (WHO Academy style)
- [ ] Course catalogue — card grid, search, filters (topic, audience, type)
- [ ] Course detail page — overview, objectives, module outline, duration, cert info, Enrol CTA
- [ ] Registration / login / password reset
- [ ] Course player — left module nav, content area, mark-complete, progress bar, resume
- [ ] Quiz / assessment UI — score, retry, feedback
- [ ] Learner dashboard — enrolled courses, progress, certificates, payment history
- [ ] Certificate download view (PDF trigger)

### Admin & org screens (PRD A1–A6 streamlining)

- [ ] Admin sidebar navigation streamlined (Gurucan-style grouping)
- [ ] Course builder screens simplified where stock Moodle is too complex
- [ ] Organization dashboard — staff progress, completions
- [ ] Public certificate verification page (enter ID → valid/invalid, name, course, date)

### Quality

- [ ] Desktop layouts match Figma
- [ ] Mobile layouts match Figma
- [ ] WCAG 2.1 AA intent: contrast, keyboard nav
- [ ] Tested on low-end Android + common Nigerian browsers

**Done when:** all P0 learner screens and verification page implemented in theme; admin UI streamlined for core flows; responsive and usable on mobile.

---

## Phase 2 — Core LMS configuration

- [ ] Roles defined: Learner, Organization admin, Content admin, Super admin
- [ ] Capabilities mapped per role (RBAC)
- [ ] Self-registration enabled (email + password)
- [ ] Enrolment methods: manual, self, cohort/org bulk
- [ ] Course completion tracking enabled (activities + course level)
- [ ] Quiz defaults: pass mark 70%, attempt limits, feedback mode
- [ ] Course categories and tags configured
- [ ] Platform language: English (multilingual-capable for future)
- [ ] SMTP configured — test welcome email sends
- [ ] Site settings: site name, summary, front page → catalogue
- [ ] Privacy policy page (NDPA text)
- [ ] Registration consent checkbox linked to privacy policy

**Done when:** roles, enrolment, completion, quiz defaults, email, and catalogue structure configured; test user can register, enrol, and receive email.

---

## Phase 3 — P0 features wiring

Aligns with PRD Section 7 P0 (F6–F10, A4–A8).

### Certificates (F6, F7, A4)

- [ ] Custom Certificate plugin configured per course template
- [ ] Auto-issue on course completion + final exam pass
- [ ] PDF fields: learner name, course, date, unique verification ID, signatures/logos
- [ ] Public verification URL live (`/verify` or theme route)
- [ ] Verification returns: valid/invalid, name, course, date (no extra PII)
- [ ] Admin certificate revoke works (verification shows revoked)

### Organization bulk enrol (A7)

- [ ] Organization registration / approval workflow
- [ ] CSV bulk upload of staff
- [ ] Invite link or invite code per organization
- [ ] Org admin dashboard: enrolment, progress, scores, certificates
- [ ] Seat allocation for paid org batches

### Payments (F9, A5)

- [ ] Paystack **or** Flutterwave plugin installed and configured (test mode)
- [ ] Paid course checkout: card, transfer, USSD
- [ ] Payment receipt email on success
- [ ] No card data stored on platform (gateway-only)
- [ ] Free vs paid course labelling on catalogue and detail pages

### Notifications (F10)

- [ ] Welcome on registration
- [ ] Enrolment confirmation
- [ ] Course completion
- [ ] Certificate issued
- [ ] Payment receipt

### Reports & export (A8)

- [ ] Enrolments report
- [ ] Progress / completion rates
- [ ] Quiz performance
- [ ] Certificates issued
- [ ] Revenue (paid courses)
- [ ] CSV export for org admin and super admin

**Done when:** every PRD P0 feature in Section 7 demonstrated on local/staging — cert issue + verify, org bulk enrol, payment checkout (test), notifications, reports.

---

## Phase 4 — DPTC course production

Source materials in `content/dptc/`. One course per PRD Section 5.

### Course structure

- [ ] Module 0: Course Introduction and Outline (23 slides) — no quiz
- [ ] Module 1: The Drug Use Situation in Nigeria (29 slides) + module quiz
- [ ] Module 2: Drugs and Effects (16 slides) + module quiz
- [ ] Module 3: Causes of Drug Use and Stigma (22 slides) + module quiz
- [ ] Module 4: Supply Reduction (25 slides) + module quiz
- [ ] Module 5: Demand and Harm Reduction (19 slides) + module quiz
- [ ] Module 6: Drug Screening (29 slides) + module quiz
- [ ] Module 7: Types of Drug Treatment (21 slides) + module quiz
- [ ] Module 8: Interventions in the Family (23 slides) + module quiz
- [ ] Module 9: Special Populations (28 slides) + module quiz
- [ ] Module 10: Human Rights and Drug Users (23 + 6 slides) + module quiz
- [ ] Module 11: Law Enforcement Issues (26 slides) + module quiz
- [ ] Module 12: Advocacy (22 slides) + module quiz
- [ ] Final assessment (certificate-qualifying, ≥70% pass)
- [ ] Trainer Resource Manual (236 pp. PDF) attached as downloadable resource

### Content & assessment

- [ ] PPT modules converted to lesson format (embedded slides or paged export)
- [ ] Module quizzes built from approved question banks
- [ ] Final exam question bank approved by KADSAMHSA
- [ ] Certificate template configured for DPTC (logo, signatories, wording)
- [ ] Course set to free enrolment (unless pricing decision changes)
- [ ] Course published and shareable URL works
- [ ] End-to-end learner test: enrol → all modules → final exam → cert PDF + verify

**Done when:** KADSAMHSA reviews and approves the complete DPTC course as a learner; cert issues within 1 minute of passing final exam.

---

## Phase 5 — Staging, UAT, harden

- [ ] Staging environment deployed (matches prod stack)
- [ ] HTTPS enforced on staging
- [ ] Daily automated backups configured; restore tested (RPO ≤ 24h)
- [ ] NDPA: consent, privacy policy, data minimization on verify page verified
- [ ] OWASP top-10 security checklist completed
- [ ] Admin action logging enabled
- [ ] Password hashing and RBAC verified
- [ ] Low-bandwidth / 3G testing: catalogue and lesson pages < 3s first load target
- [ ] Cross-device testing: low-end Android, iOS Safari, Chrome, Firefox
- [ ] Pilot org UAT: bulk enrol, progress tracking, report export
- [ ] KADSAMHSA staff UAT: course builder, publish, cert template
- [ ] Critical/major defects logged and fixed
- [ ] Performance sized for 5,000 users / 500 concurrent learners

**Done when:** UAT sign-off from KADSAMHSA and pilot org; zero open critical/major defects; NFRs in PRD Section 9 met on staging.

---

## Phase 6 — Production deploy & go-live

- [ ] Production domain DNS configured
- [ ] SSL/TLS certificate installed
- [ ] Production Moodle deployed (same version as staging)
- [ ] Database migrated / content synced from staging
- [ ] Theme and plugins deployed to `moodle/theme/kadsamhsa/` and `moodle/local/` or plugin paths
- [ ] Payment gateway switched to live keys
- [ ] SMTP production credentials configured
- [ ] Cron and backups running on production
- [ ] Monitoring / uptime alerting configured (99% target)
- [ ] Smoke tests: register, enrol, pay (if paid course), complete, cert, verify
- [ ] DPTC course live and publicly accessible
- [ ] Launch announcement ready

**Done when:** production site live on KADSAMHSA domain; DPTC course publicly enrolable; all P0 flows pass smoke tests on production.

---

## Phase 7 — Training & handover

- [ ] Admin training session: Content admin (course builder, quizzes, certs)
- [ ] Admin training session: Super admin (users, orgs, pricing, reports, settings)
- [ ] Training sessions recorded
- [ ] Admin manual written in `docs/` (course publish, org enrol, reports, cert templates)
- [ ] Runbooks in `docs/` (backup restore, cron, plugin update, deploy)
- [ ] All credentials handed over (hosting, DB, Moodle admin, gateway, SMTP, domain)
- [ ] Theme source code ownership confirmed (KADSAMHSA)
- [ ] Configuration and content export documented
- [ ] KADSAMHSA staff publish a test course unassisted (acceptance test)

**Done when:** KADSAMHSA staff complete unassisted test course publish; credentials, code, and docs received; training recordings delivered.

---

## Phase 8 — Warranty / SLA

- [ ] Warranty period defined (suggest 3 months post-launch)
- [ ] Defect reporting channel documented
- [ ] Response time SLAs agreed (critical / major / minor)
- [ ] Post-launch defect triage process active
- [ ] Monthly uptime report template
- [ ] Monthly backup verification report template
- [ ] Optional annual support/hosting SLA priced separately
- [ ] Handover complete — vendor role limited to hosting/maintenance per SLA

**Done when:** warranty window active; first monthly uptime and backup reports delivered; KADSAMHSA operating platform independently for routine tasks.

---

## P0 traceability (PRD Section 7)

| PRD ID | Requirement | Phase |
|--------|-------------|-------|
| F1 | Public landing + catalogue | 1 |
| F2 | Course detail page | 1 |
| F3 | Self-registration / login | 1, 2 |
| F4 | Course player | 1 |
| F5 | Module quizzes + final exam | 2, 4 |
| F6 | Auto PDF certificate | 3 |
| F7 | Public cert verification | 1, 3 |
| F8 | Learner dashboard | 1 |
| F9 | Paystack/Flutterwave checkout | 3 |
| F10 | Email notifications | 2, 3 |
| F11 | Responsive / low-bandwidth | 1, 5 |
| A1 | Course builder (streamlined) | 1, 2 |
| A2 | Content blocks (PPT/PDF/video/etc.) | 2, 4 |
| A3 | Quiz builder | 2, 4 |
| A4 | Certificate template editor | 3, 4 |
| A5 | Catalogue, categories, pricing/offers | 2, 3 |
| A6 | User & org management | 2, 3 |
| A7 | Org bulk enrol (CSV/invite) | 3 |
| A8 | Reports + CSV export | 3 |
