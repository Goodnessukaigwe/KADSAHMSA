# KADSAMHSA LMS

Online learning platform for KADSAMHSA: self-paced courses, assessments, and verifiable certificates.

**Active build:** Next.js 15 (App Router) + TypeScript · Supabase (Postgres + Auth + Storage + RLS) · Tailwind + shadcn/ui · Paystack · Resend · Vercel

Product requirements: [(New)KADSAMHSA_LMS_PRD_v2.md](./(New)KADSAMHSA_LMS_PRD_v2.md) · Build checklist: [PHASES_v2.md](PHASES_v2.md)

The Moodle theme demo and the old Fastify/Vite monorepo are archived under [`prototype/`](prototype/) (read-only reference). Do not extend them as the production path.

## Quick start

Node 22 (see `.nvmrc`).

```bash
nvm use
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Public signup creates a confirmed account and signs the learner in. Forgot-password still sends a reset mail through `/auth/confirm`. Org CSV enrol and the DPTC import script still auto-confirm provisioned accounts.

In the Supabase dashboard (required — this repo does not toggle it for you):

1. **Authentication → Providers → Email:** turn **Confirm email OFF** so signup does not send a verification mail.
2. **Authentication → URL configuration:** Site URL `http://localhost:3000`. Redirect allow-list: `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`, plus the same paths on staging/production.
3. **Authentication → Email templates** — reset password must use a token-hash link that `/auth/confirm` already verifies:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

Without (2) and (3), the forgot-password inbox click will not land in-app. Do not use Resend for these mails; F10 transactional mail is later.

### Database migrations

Apply SQL in `supabase/migrations/` to your project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or paste the SQL editor scripts in order: [`supabase/apply-all.sql`](supabase/apply-all.sql) (identity → courses → enrolments → certificates bucket), then [`supabase/apply-phase3.sql`](supabase/apply-phase3.sql) (quizzes, attempts, certificates, verify RPC), then [`supabase/apply-phase4.sql`](supabase/apply-phase4.sql) (course fields, lessons, DPTC seed, draft catalogue slugs), then [`supabase/apply-phase4b.sql`](supabase/apply-phase4b.sql) (any-course final quiz + `quiz_questions`), then [`supabase/apply-phase5.sql`](supabase/apply-phase5.sql) (organisations, memberships, invites, org-scoped RLS), then [`supabase/apply-phase6.sql`](supabase/apply-phase6.sql) (private `course-media` bucket + `lesson_assets`), then [`supabase/apply-phase7.sql`](supabase/apply-phase7.sql) (`consents` for NDPA signup records), then [`supabase/apply-production-cleanup.sql`](supabase/apply-production-cleanup.sql) (unpublish seed courses that have enrolments or certificates; delete empty seed/draft leftovers), then [`supabase/apply-enrol-requests.sql`](supabase/apply-enrol-requests.sql) (`enrolment_requests`, drop learner self-enrol, unpublish leftover `p4-verify-*` / `p4b-verify-*` / `p6-media-*` / `cleanup-verify-*` rows). Existing `KAD-` certificate rows and `/verify` keep working.

After the first signup, grant yourself admin (replace the email) using [`supabase/snippets/grant-super-admin.sql`](supabase/snippets/grant-super-admin.sql). Without that row, `/admin` redirects learners to `/my`.

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local app (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Directory map

```
KADSAHMSA/
├── app/                         # Next.js App Router
│   ├── (public)/                # landing, catalogue, course detail, cert verify
│   ├── (auth)/                  # login, register, password reset
│   ├── (learner)/               # dashboard, player, certificates
│   ├── (org)/                   # org dashboard
│   ├── (admin)/                 # course builder shell
│   └── api/                     # Route Handlers (Paystack, certs, health)
├── components/                  # shadcn/ui + domain components
├── lib/
│   ├── supabase/                # browser, server, and service-role clients
│   ├── permissions.ts           # role checks (server is load-bearing)
│   └── domain/                  # enrolment / quiz / cert rules
├── supabase/
│   ├── migrations/
│   └── policies/                # RLS
├── public/                      # brand assets seeded from the Moodle prototype
├── content/dptc/                # DPTC source PPT/PDF
├── docs/                        # runbooks and handover stubs
└── prototype/                   # archived Moodle / Docker / old monorepo
```

**Secrets:** never put Paystack secret, Supabase service-role, Resend, or webhook secrets in `NEXT_PUBLIC_*`. See `.env.example`.

## Prototype (Moodle demo)

UX reference only. To run the old local Moodle stack, see [prototype/README.md](prototype/README.md).
