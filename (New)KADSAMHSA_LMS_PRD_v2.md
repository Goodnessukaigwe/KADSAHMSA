# KADSAMHSA
## Learning Management System (LMS) Platform
### Product Requirements Document (PRD) — v2

> **This document supersedes [prototype/KADSAMHSA_LMS_PRD_v1.md](prototype/KADSAMHSA_LMS_PRD_v1.md) §8 and the `prototype/kadsamhsa-platform` Fastify / Vite monorepo direction.** Product scope in §§1–7 and §9 is unchanged. Reviewers can diff by section number against v1.

**Version:** 2.0 · **Date:** 24 August 2026  
**Audience:** KADSAMHSA management · Design & development vendor (contract basis)

---

## Contents

1. Executive Summary
2. Problem Statement
3. Goals and Non-Goals
4. Design References
5. Launch Content: The DPTC Course
6. Users and User Stories
7. Functional Requirements
8. Build Approach: Next.js + Supabase Application
9. Non-Functional Requirements
10. Deliverables, Phases, and Acceptance (Contract Basis)
11. Success Metrics
12. Open Questions
13. Timeline Considerations

---

## 1. Executive Summary

KADSAMHSA will launch an online Learning Management System (LMS) that allows individuals and partner organizations to enrol in courses, complete assessments, and earn verifiable certificates. Two reference products define the experience: the learner-facing site should follow the WHO Academy platform (https://whoacademy.org/coursewares), with a clean, card-based course catalogue, guided course pages, learner dashboards, and automatic certification, while the admin backend should work like Gurucan: a simple sidebar-driven back office where a non-technical administrator creates courses from content blocks, sets prices and offers, and manages users, without any technical skill.

Scope of this contract: a responsive web application only. No native mobile apps, and no other channels, are included; the web app must simply work well on phones. The platform will be delivered as a single Next.js application with a Supabase backend (see Section 8), rather than a Moodle customization or a split SPA/API monorepo. One TypeScript codebase is easier to hire for and still supports 5,000+ users.

Guiding principle of self-management: this platform is being built specifically so that KADSAMHSA does not depend on anyone for day-to-day operation. After handover, KADSAMHSA staff must be able to run everything themselves through the admin backend: create and publish courses, manage users and organizations, set prices, and issue certificates. Every design and platform decision in this document should be tested against that principle. The vendor's role after launch is limited to hosting, maintenance, and support under an SLA, never routine operations. Staff publish courses in-app; no engineer is required for content work.

The launch course is 'Sensitization on Drug Use, Drug Dependence and Drug Prevention, Treatment and Care (DPTC)', an existing UNODC/EU-supported training curriculum for law enforcement operatives and the general public in Nigeria, currently held as 14 PowerPoint modules and a 236-page trainer resource manual (see Section 5).

This PRD serves two purposes: (1) a brief for the designer/developer, and (2) the scope baseline for the delivery contract. Sections 6–7 define what must be built; Section 10 defines contract deliverables and acceptance criteria.

---

## 2. Problem Statement

KADSAMHSA's training curricula currently exist as PowerPoint decks and PDF manuals delivered through in-person workshops. This limits reach (only participants physically present are trained), makes completion impossible to track, and provides no standard way to certify that a person or organization has completed the training. Partner organizations that want to train their staff have no self-service channel to do so.

Without a platform, every training cycle requires facilitators, venues, and logistics, and the organization cannot demonstrate, at scale, who has been trained and to what standard.

---

## 3. Goals and Non-Goals

### 3.1 Goals

- Any individual can self-register free of charge, complete the DPTC course online at their own pace, and download a verifiable certificate after passing the assessment.
- Partner organizations can register, bulk-enrol their staff, and monitor their staff's progress and completion from an organization dashboard.
- Selected courses can be sold: the platform supports paid enrolment via Nigerian payment gateways (e.g. Paystack or Flutterwave).
- KADSAMHSA staff can create and publish new courses end-to-end (content, quizzes, certificates) through the admin backend with no vendor involvement.
- Certificates carry a unique ID verifiable by anyone through a public verification page.

### 3.2 Non-Goals (out of scope for v1)

- Native mobile apps (iOS/Android). The web platform must be fully mobile-responsive instead; apps may be a future phase.
- Live/virtual classroom delivery (webinars, video conferencing). v1 is self-paced e-learning; integration with Zoom/Meet can come later.
- Authoring interactive e-learning from scratch inside the platform (e.g. building SCORM packages). v1 supports uploading slides, PDFs, video, and building quizzes; advanced authoring tools are a future consideration.
- Full offline mode. Low-bandwidth optimization is required (see Section 9), but offline-first delivery is deferred.
- Multi-language content translation. The platform should be multilingual-capable (e.g. Hausa later), but v1 content is English only.

---

## 4. Design References

### 4.1 Learner experience: WHO Academy

The designer should study https://whoacademy.org/coursewares and reproduce its overall experience with KADSAMHSA branding. Key patterns to replicate:

- A public course catalogue of visual course cards (cover image, title, short description, duration, level, free/paid label) with search and filters by topic, audience, and type.
- A course detail page with overview, learning objectives, module/lesson outline, estimated duration, certificate information, and a prominent 'Enrol' call to action.
- A learner dashboard showing enrolled courses, progress bars, resumable 'continue learning' entry points, and earned certificates.
- A clean in-course player: left-hand module/lesson navigation, main content area, 'mark complete / next' progression, and progress indicator.
- Calm, credible public-health visual language: generous white space, strong typography, accessible color contrast, photography of real people and communities.
- Fully responsive layouts; a large share of Nigerian learners will use smartphones on mobile data.

### 4.2 Admin backend: Gurucan

The admin back office should follow the Gurucan model (KADSAMHSA has hands-on experience with it and screenshots are available). Patterns to replicate:

- A single left sidebar organizing everything: Dashboard, CRM/Users, Online school settings, Products (Courses, Webinars, Articles), Offers, Marketing, Account.
- Course creation as a simple form-plus-blocks flow: course name, short and full description, cover image; lessons built by adding content blocks (video, text, images, audio, downloads, quiz), with no technical knowledge required.
- Each course gets a shareable public URL immediately, with Save / Preview / Publish–Unpublish / Delete controls.
- Pricing decoupled from content via 'Offers': an offer packages one or more courses at a price (or free); coupons/discounts supported.
- Built-in basic marketing: email templates, email broadcast to learners, notifications.
- School settings editable by admins: branding, custom domain, landing pages, integrations.
- Admin panel itself is mobile-adaptive, so staff can manage the school on the go.

Gurucan capabilities deliberately excluded from this scope (consistent with Section 3.2 non-goals): native mobile apps / white-label apps, webinars and live sessions, and community chat. The deliverable is a web application only.

Deliverable for the designer: a lightweight design system (colors, typography, components) plus high-fidelity designs for the screens listed in Section 6 (learner screens per the WHO Academy reference, admin screens per the Gurucan reference), implemented as the app UI (Section 8).

---

## 5. Launch Content: The DPTC Course

All supplied materials belong to ONE course: 'Sensitization on Drug Use, Drug Dependence and Drug Prevention, Treatment and Care (DPTC)', developed under the EU-funded 'Response to Drugs and Related Organised Crime in Nigeria' project with UNODC. The 236-page Trainer Resource Modules PDF (May 2019) is the facilitator manual for the same curriculum and should be attached as a downloadable resource for trainers, not published as a separate course.

Proposed module structure (order follows a logical learning path; KADSAMHSA may reorder):

| # | Module (from supplied materials) | Slides | Assessment |
|---|---|---|---|
| 0 | Course Introduction and Outline (Introductory Module) | 23 | None |
| 1 | The Drug Use Situation in Nigeria | 29 | Module quiz |
| 2 | Drugs and Effects: Understanding Drug Dependency | 16 | Module quiz |
| 3 | Causes of Drug Use and Associated Stigma of Drug Users | 22 | Module quiz |
| 4 | Understanding the Concept of Supply Reduction | 25 | Module quiz |
| 5 | Understanding the Concept of Demand and Harm Reduction | 19 | Module quiz |
| 6 | Drug Screening: Steps to Take | 29 | Module quiz |
| 7 | Types of Drug Treatment | 21 | Module quiz |
| 8 | Interventions and Responses to Drug Problems in the Family | 23 | Module quiz |
| 9 | Special Populations: Women, People Who Inject Drugs, Young Users | 28 | Module quiz |
| 10 | Human Rights and Drug Users (incl. supplement: The Death Penalty for Drug Offences) | 23 + 6 | Module quiz |
| 11 | Specific Issues for Law Enforcement | 26 | Module quiz |
| 12 | Understanding Advocacy and Steps to Achieve Success | 22 | Module quiz |
| - | Final assessment (certificate-qualifying) | - | Final exam |
| - | Trainer Resource Manual (PDF, 236 pp.), downloadable resource | - | - |

Content conversion note: the vendor converts the supplied PowerPoint modules into the platform's lesson format for launch (slides embedded per lesson, or exported as paged content), and builds the module quizzes and final assessment from question banks supplied/approved by KADSAMHSA. Thereafter KADSAMHSA staff perform this work themselves for new courses.

---

## 6. Users and User Stories

### 6.1 Roles

| Role | Description |
|---|---|
| Learner (individual) | Self-registers free; enrols in free courses or pays for paid ones; earns certificates. |
| Organization admin | Manages an organization account; bulk-enrols staff; tracks staff progress and completions; downloads reports. |
| Content admin (KADSAMHSA) | Creates/edits/publishes courses, lessons, quizzes, and certificate templates; manages the catalogue. |
| Super admin (KADSAMHSA) | Manages users, organizations, pricing, payments, platform settings, branding, and reports. |
| Verifier (public) | Anyone with a certificate ID; checks validity on a public page without logging in. |

### 6.2 Key User Stories

**Learner**

- As a learner, I want to browse and search the course catalogue without an account, so that I can see what is offered before registering.
- As a learner, I want to register with my email (or phone number) and enrol in a course in under two minutes, so that sign-up is not a barrier.
- As a learner, I want my progress saved automatically so that I can stop and resume on any device, including my phone.
- As a learner, I want to take module quizzes and a final assessment, see my score, and retry if I fail, so that I can qualify for the certificate.
- As a learner, I want my certificate as a downloadable PDF with a unique verification ID, so that I can share it with employers.
- As a learner, I want to pay for a paid course with my Nigerian bank card, transfer, or USSD, so that payment is practical locally.

**Organization admin**

- As an org admin, I want to register my organization and add staff by uploading a list (CSV) or sharing an invite link/code, so that onboarding many staff is fast.
- As an org admin, I want a dashboard of my staff's enrolment, progress, scores, and certificates, so that I can evidence training compliance.
- As an org admin, I want to export completion reports (CSV/PDF), so that I can report to my management or funders.
- As an org admin, I want to pay once for a batch of seats on a paid course, so that I do not process individual payments.

**KADSAMHSA content admin**

- As a content admin, I want to create a course with modules and lessons, and upload slides (PPTX/PDF), documents, images, and video, so that I can publish new courses without a developer.
- As a content admin, I want a quiz builder (multiple choice, true/false, matching) with question banks, pass marks, attempt limits, and randomization, so that assessments are credible.
- As a content admin, I want to configure the certificate template per course (logo, signatories, wording), so that certificates are official.
- As a content admin, I want to save drafts and preview a course as a learner before publishing, so that quality is controlled.

**Super admin**

- As a super admin, I want to manage users, roles, and organizations, set course pricing, and view payment reconciliation, so that operations are under KADSAMHSA control.
- As a super admin, I want platform-wide analytics (registrations, enrolments, completion rates, certificates issued, revenue), so that I can report impact.

---

## 7. Functional Requirements

P0 = must have for launch. P1 = should have (fast follow). P2 = future consideration.

### 7.1 Learner Frontend

| ID | Requirement | Priority |
|---|---|---|
| F1 | Public landing page and course catalogue (cards, search, filters) in WHO Academy style; browsable without login. | P0 |
| F2 | Course detail page: overview, objectives, module outline, duration, certificate info, free/paid label, Enrol CTA. | P0 |
| F3 | Self-registration and login with email + password; password reset. Phone-number registration. | P0 (phone: P1) |
| F4 | Course player: module/lesson navigation, embedded slide/PDF/video content, mark-complete progression, progress bar, resume where left off. | P0 |
| F5 | Module quizzes and final assessment: scoring, configurable pass mark (default 70%), limited retries, feedback. | P0 |
| F6 | Auto-generated PDF certificate on passing: learner name, course, date, unique verification ID, signatures/logos. | P0 |
| F7 | Public certificate verification page (enter ID or scan QR code → validity, name, course, date). | P0 (QR: P1) |
| F8 | Learner dashboard: my courses, progress, certificates, payment history. | P0 |
| F9 | Payment checkout for paid courses via Paystack or Flutterwave (card, transfer, USSD); receipts by email. | P0 |
| F10 | Email notifications: welcome, enrolment, completion, certificate issued, payment receipt. | P0 |
| F11 | Fully responsive on mobile; core flows usable on low-bandwidth connections (see NFRs). | P0 |
| F12 | Course ratings/feedback survey at completion. | P1 |
| F13 | Discussion/Q&A per course. | P2 |
| F14 | Multi-language UI (e.g. Hausa). | P2 |

### 7.2 Admin Backend (Content Management)

| ID | Requirement | Priority |
|---|---|---|
| A1 | Course builder (Gurucan-style): create course with name, descriptions, cover image; add modules/lessons; lessons composed of content blocks; drag-and-drop reordering; Save / Preview / Publish–Unpublish / Delete; shareable course URL. | P0 |
| A2 | Content blocks per lesson: PPTX/PDF (rendered as paged/embedded content), video (upload or YouTube/Vimeo embed), images, audio, rich text, downloadable attachments. | P0 |
| A3 | Quiz builder: MCQ, true/false, matching; question banks; randomization; pass mark, attempts, time limits per quiz. | P0 |
| A4 | Certificate template editor per course: upload background/logo, set fields (name, course, date, ID, signatories). | P0 |
| A5 | Catalogue management: categories/tags, featured courses. Pricing via Offers (Gurucan-style): an offer packages one or more courses free or at a price; seat bundles for organizations. | P0 |
| A6 | User management (CRM-style view): view/search users, see enrolments and progress per user, reset access, assign roles; organization management (approve orgs, view org dashboards). | P0 |
| A7 | Org bulk enrolment: CSV upload and invite link/code per organization; seat allocation for paid courses. | P0 |
| A8 | Reports: enrolments, progress, completion rates, quiz performance, certificates issued, revenue; export CSV. | P0 |
| A9 | Branding/school settings without code: logo, colors, footer, contact details, custom domain. | P1 |
| A10 | Marketing tools: email templates, email broadcast to learners/segments, discount coupons. | P1 |
| A11 | SCORM/xAPI package upload support (for future interactive content). | P1 |
| A12 | Landing page per course/offer: simple template-based promo page editable by admins (Gurucan 'Landings'). | P1 |
| A13 | Admin panel usable on mobile: staff can review, edit, and publish from a phone (Gurucan's admin is mobile-adaptive). | P1 |
| A14 | Cohorts/deadlines: enrolment windows, completion deadlines, drip content (scheduled lesson release). | P2 |
| A15 | Subscription/membership pricing (recurring payments, access levels, trials) in addition to one-time course payments. | P2 |
| A16 | Web push notifications and third-party integrations (webhooks/Zapier) for marketing automation. | P2 |

### 7.3 Certification Rules

- A certificate is issued automatically when the learner completes all modules and passes the final assessment at or above the configured pass mark.
- Each certificate has a unique, non-guessable verification ID stored with learner name, course, score, and issue date.
- Verification page returns: valid/invalid, learner name, course title, issue date. No other personal data is exposed.
- Certificates remain downloadable from the learner dashboard indefinitely; admins can revoke a certificate (verification then shows revoked).

**Acceptance example:** Given a learner has completed all 13 modules and scores ≥70% on the final assessment, when they finish the attempt, then a PDF certificate with a unique ID is generated within one minute, emailed to them, and available on their dashboard; and entering that ID on the public verification page returns 'valid' with their name and course.

---

## 8. Build Approach: Next.js + Supabase Application

Product scope is unchanged. The **build approach** is.

v1 §8 recommended Moodle LTS with a custom theme. A later attempt (`kadsamhsa-platform/`) proposed a React 19 + Vite SPA, Fastify API, Redis, S3, and a background worker. Both are deprecated for this product.

| Attempt | Why it is hard for this team |
|---|---|
| Moodle 4.5 + PHP + Mustache theme (v1 §8) | PHP/Mustache/plugin internals; theming fights the LMS; most JS/React developers cannot ship features without Moodle expertise. |
| `kadsamhsa-platform` (React 19 + Vite + Fastify + Redis + worker monorepo) | Three runtimes, custom auth, custom migrations, Redis, S3, and a worker — a lot of ops before a course player exists. |

**Locked stack for v2:** Next.js 15 (App Router) + TypeScript, Supabase (Postgres + Auth + Storage + RLS), Tailwind CSS + shadcn/ui, Paystack, Resend (or similar) for email, Inngest (or Supabase cron) for background jobs, Vercel (or similar) for app hosting. No Redis and no separate worker process on day one. Scope remains **web-only, mobile-responsive**; no native apps.

```
Browser
  └─ Next.js 15 (App Router) + TypeScript
       ├─ Public: catalogue, course pages, cert verify (SSR for SEO)
       ├─ Learner / org / admin portals (same app, role layouts)
       └─ Route Handlers: Paystack webhooks, PDF issue, CSV export

Supabase
  ├─ Postgres          courses, quizzes, enrolments, orgs, certificates
  ├─ Auth              email/password now; phone later (F3 P1)
  ├─ Storage           PPTX/PDF/video/images + generated cert PDFs
  └─ Row Level Security  learner vs org vs staff data isolation

Paystack               card / transfer / USSD (locked for this build)
Resend (or similar)    transactional email
Inngest (or Supabase cron)  cert PDF, emails, report exports — no Redis/worker yet
Tailwind + shadcn/ui   WHO Academy / Gurucan look without Mustache
Vercel (or similar)    app hosting; Supabase hosts data — VPS optional later
```

**Why this over “Next.js + a custom Fastify API”:** auth, file uploads, and Postgres come from one dashboard. Developers work in React/TypeScript only. The scale path is vertical (Supabase plan, Vercel) then split a worker only if PDF/email volume needs it.

**Explicitly out of the new stack:** Moodle, PHP, Mustache, MariaDB-as-app-DB, Vite SPA + separate Fastify, Redis as a day-one dependency.

The existing Moodle tree in this repository and `kadsamhsa-platform/` are legacy references until a later rebuild. They are not the target runtime.

### 8.1 Self-management (unchanged principle)

KADSAMHSA staff publish courses, manage users and organizations, set prices, and issue certificates **in the app**. Routine operations must not require an engineer or a vendor ticket. After handover, the vendor's role is hosting, maintenance, and SLA support only (see Section 1 and Section 10).

### 8.2 Dual-check permissions

Every protected action enforces **both**:

1. **Supabase Row Level Security (RLS)** — learners see only their own enrolments and progress; org admins see only their organization's members; staff roles see what their role allows.
2. **Server-side permission checks** on Next.js Server Actions and Route Handlers — the same dual-check idea as `kadsamhsa-platform` (`packages/domain` permissions): the client hides controls; the server refuses unauthorized requests. **Only the server check is load-bearing.**

Administrative changes and payment/certificate transitions are written as immutable audit events.

### 8.3 Certificate verification (public, non-guessable)

Certificate verification IDs stay **public** and **non-guessable**. The public verify page still exposes only validity, learner name, course title, and issue date — nothing else. Revocation changes public status without exposing additional personal data. PDFs are stored privately in Supabase Storage; the verify URL is not a direct file listing.

Issuance remains idempotent: once every required learning item is complete and the final assessment reaches the configured pass mark (default 70%), one verification ID and one PDF are created. Re-running the check for an already-certified enrolment is a no-op.

### 8.4 Domain model (carried forward)

Product logic is not reinvented — only the runtime is. The domain model from `kadsamhsa-platform/docs/ARCHITECTURE.md` is the starting schema for Supabase Postgres:

| Area | Main records |
|---|---|
| Identity | `users`, `password_credentials` (or Supabase Auth identities), `sessions`, `roles`, `user_roles`, `consents` |
| Catalogue | `courses`, `course_categories`, `course_tags`, `modules`, `lessons`, `content_blocks`, `assets` |
| Learning | `enrolments`, `lesson_progress`, `course_progress`, `quiz_attempts`, `quiz_answers`, `question_banks`, `questions` |
| Commerce | `offers`, `offer_courses`, `orders`, `payments`, `payment_events`, `coupons`, `organisation_seats` |
| Organisations | `organisations`, `organisation_memberships`, `organisation_invites`, `bulk_imports` |
| Certification | `certificate_templates`, `certificates`, `certificate_revocations` |
| Operations | `notifications`, `email_deliveries`, `report_exports`, `audit_events` |

Roles map to the same capabilities as Section 6.1: Learner, Organisation admin, Content admin, Super admin, Public verifier.

### 8.5 Proposed repo layout (when coding starts)

A **single Next.js app**. Do not split into `apps/web` + `apps/api` + `packages/*` until it actually hurts. The Moodle tree stays where it is; the new app is a later pass (not this document).

```
kadsamhsa-web/                 # created in a later pass; not this repo's Moodle tree
├── app/
│   ├── (public)/              # landing, catalogue, course detail, cert verify
│   ├── (auth)/                # login, register, password reset
│   ├── (learner)/             # dashboard, player, certificates
│   ├── (org)/                 # org dashboard, bulk enrol, reports
│   ├── (admin)/               # course builder, users, offers, settings
│   └── api/                   # Route Handlers: Paystack webhooks, PDF issue, CSV export
├── components/                # shadcn/ui + domain components
├── lib/
│   ├── supabase/              # server + browser clients
│   ├── permissions.ts         # role checks (shared; server is load-bearing)
│   └── domain/                # enrolment, quiz, cert rules
├── supabase/
│   ├── migrations/
│   └── policies/              # RLS
└── public/
```

### 8.6 Environment and secrets

- **Never** put Paystack secret keys, Supabase service-role keys, storage secrets, Resend (or SMTP) credentials, or webhook secrets in `NEXT_PUBLIC_*`. Those values are shipped to every visitor's browser.
- `NEXT_PUBLIC_*` may hold only publishable values (e.g. Supabase URL + anon key, Paystack public key).
- Server-only env (Route Handlers, Server Actions, Inngest/cron): `PAYSTACK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (or equivalent), webhook signing secrets.
- The browser never reaches Postgres directly for privileged work and never holds a payment or storage secret. Paystack payment status changes only from a verified gateway event or an audited staff action.

### 8.7 Vendor obligations

- Licence costs for any non-open-source SaaS (Vercel, Supabase, Resend, Inngest, Paystack fees) must be disclosed and approved in the contract.
- KADSAMHSA owns the application source, configuration, content, and data; full handover on exit (see Section 10).
- The admin experience must be usable by non-technical staff after the included training; routine course publishing must require no vendor input.

---

## 9. Non-Functional Requirements

- **Performance/mobile:** Mobile-responsive across all core flows; tested on low-end Android devices and common Nigerian browsers.
- **Low bandwidth:** Course pages usable on 3G; media compressed; lazy loading; target < 3s first load on 3G for catalogue and lesson pages.
- **Security:** HTTPS everywhere; hashed passwords; role-based access control; OWASP top-10 hardening; admin actions logged.
- **Data protection:** Compliance with the Nigeria Data Protection Act (NDPA 2023): consent at registration, privacy policy, data minimization on the public verification page.
- **Payments:** Payments handled entirely by the gateway (Paystack/Flutterwave); no card data stored on the platform.
- **Backups:** Daily automated backups with tested restore; recovery point ≤ 24h.
- **Availability/scale:** 99% uptime target; hosting sized for at least 5,000 registered users / 500 concurrent learners at launch, scalable beyond.
- **Accessibility:** WCAG 2.1 AA intent: contrast, keyboard navigation, captions/transcripts for video where provided.
- **Analytics:** Platform analytics available to admins; optional Google Analytics integration.

---

## 10. Deliverables, Phases, and Acceptance (Contract Basis)

The contract should be structured around these Next.js delivery phases, each with defined deliverables and acceptance before payment milestones. Requirement IDs are those in Section 7.

| Phase | Deliverables | Acceptance criteria | Maps to |
|---|---|---|---|
| 1. Foundation | Sitemap and user flows; wireframes; high-fidelity designs (desktop + mobile) for: landing, catalogue, course detail, registration/login, course player, quiz, certificate, learner dashboard, org dashboard, admin course builder, verification page; clickable prototype; mini design system (Tailwind + shadcn/ui tokens). Next.js 15 App Router + TypeScript app scaffold; Supabase project (Postgres, Auth, Storage, RLS skeleton); dual-check permissions module; env/secrets layout; staging on Vercel (or similar). | KADSAMHSA signs off designs against Section 4 and Section 6 stories. Staging app boots with Auth (email/password), RLS enabled, and no secrets in `NEXT_PUBLIC_*`. | Design system; F3 (email auth scaffolding); F11 (responsive shell) |
| 2. Learner | Public catalogue and course pages (SSR); course player; learner dashboard; registration/login/password reset; progress persist and resume. | F1, F2, F3 (email; phone remains P1), F4, F8, F11 demonstrated on staging for a sample course. | F1, F2, F3, F4, F8, F11 |
| 3. Assessment & certificates | Quiz taking (scoring, pass mark, retries, feedback); auto PDF certificate; public verify page; transactional emails for completion and certificate issued. | F5, F6, F7 (ID entry; QR remains P1), F10 (completion + cert emails). §7.3 acceptance example met: unique non-guessable ID; verify page shows only validity, name, course, date. | F5, F6, F7, F10; A3 (take path); A4 (issue path) |
| 4. Admin builder & Paystack | Gurucan-style course builder and content blocks; quiz builder; certificate template editor; catalogue/offers; Paystack checkout (card, transfer, USSD); payment receipts. | A1, A2, A3, A4, A5, F9, F10 (welcome, enrolment, receipt). Content admin publishes a course unassisted on staging. Paystack secrets server-only; webhook signature verified. | A1–A5, F9, F10 |
| 5. Organizations | Org accounts; CRM-style user management; CSV / invite bulk enrolment; seat allocation; org dashboard; CSV reports. | A6, A7, A8. Org admin sees only their staff; RLS + server checks refuse cross-org access. | A6, A7, A8 |
| 6. DPTC content | Full DPTC course built per Section 5: 13 modules + intro, quizzes, final assessment, certificate template, trainer manual attached. | KADSAMHSA reviews and approves the complete course as a learner. | Section 5; uses F4–F7, A1–A4 |
| 7. UAT & launch | Cross-device and low-bandwidth testing; security checklist; UAT with KADSAMHSA staff and a pilot org; bug fixes; production launch on KADSAMHSA domain. | UAT sign-off; every P0 requirement in Section 7 on production; zero open critical/major defects at launch. | F1–F11 P0, A1–A8 P0; Section 9 |
| 8. Handover | Admin training (content admin + super admin) with recorded sessions; admin manual; all credentials, source, Supabase project access, and documentation handed over. | KADSAMHSA staff publish a test course unassisted (self-management principle). | A1–A5 operational |
| 9. Support & maintenance | Defined warranty period (suggest 3 months post-launch, defects fixed free), then optional annual support/hosting SLA priced separately. | SLA response times met; monthly uptime/backup reports. | Section 9 |

P1 items (F3 phone, F7 QR, F12, A9–A13) are fast-follow after P0 launch unless KADSAMHSA pulls a subset into a phase in writing. P2 items (F13, F14, A14–A16) are out of this contract unless quoted separately.

**Contract guidance:**

- Fixed price per phase against the acceptance criteria above; suggested payment grouping 15 / 20 / 15 / 20 / 15 / 10 / 5 across phases 1–8 (Foundation; Learner; Assessment & certificates; Admin builder & Paystack; Organizations; DPTC; UAT & launch; Handover), or an equivalent split agreed in the contract. Phase 9 is a separate SLA.
- Change control: any scope addition beyond Section 7 P0/P1 is quoted separately in writing.
- IP: all designs, application source, configuration, and content are the property of KADSAMHSA on payment.
- Hosting, domain, and third-party costs (Vercel, Supabase, Resend, Inngest, Paystack fees) itemized separately from the build fee.

---

## 11. Success Metrics

| Metric | Target (first 6 months) |
|---|---|
| Registered learners | ≥ 2,000 |
| Partner organizations onboarded | ≥ 10 |
| DPTC course completion rate (of enrolled) | ≥ 40% |
| Certificates issued | ≥ 800 |
| Certificate verifications performed | Tracked (baseline) |
| Courses published by KADSAMHSA staff without vendor help | ≥ 1 new course |
| Platform uptime | ≥ 99% |

---

## 12. Open Questions

- Branding: does KADSAMHSA have a brand guide (logo files, colors, fonts)? (KADSAMHSA, blocking for Phase 1 Foundation)
- Domain and hosting: existing domain to use, and who pays/holds the Vercel (or similar) and Supabase accounts? (KADSAMHSA, blocking for Phase 1 / Phase 7)
- Payments: which Paystack account, and which courses are paid at launch, at what price? DPTC assumed free. (KADSAMHSA, needed by Phase 4 Admin builder & Paystack)
- Assessments: who authors the quiz question banks: KADSAMHSA subject experts or the vendor drafting for approval? (KADSAMHSA, needed by Phase 3 / Phase 6)
- Certificate signatories and wording; any co-branding obligations to UNODC/EU on the DPTC materials? Rights to publish these materials online should be confirmed. (KADSAMHSA/legal, blocking for Phase 3 / Phase 6)
- Data protection: confirm NDPA compliance owner and privacy policy text. (KADSAMHSA/legal, needed by launch)

---

## 13. Timeline Considerations

Indicative schedule (to be confirmed in vendor proposal), mapped to Section 10: Phase 1 Foundation (incl. UX): 3–4 weeks; Phase 2 Learner: 3–4 weeks; Phase 3 Assessment & certificates: 2–3 weeks; Phase 4 Admin builder & Paystack: 3–4 weeks; Phase 5 Organizations: 2–3 weeks; Phase 6 DPTC content: 3–4 weeks (can overlap Phases 4–5); Phase 7 UAT & launch: 2–3 weeks; Phase 8 Handover: 1–2 weeks. Total roughly 3.5–4.5 months from contract signature to launch, assuming prompt reviews and that branding assets and quiz content are available on schedule.
