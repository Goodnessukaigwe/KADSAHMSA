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

In the Supabase dashboard: Authentication → URL configuration. Set Site URL to `http://localhost:3000` and add redirect URLs `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/confirm`. For local Phase 1, disable **Confirm email** (or leave it on and use the confirmation link).

### Database migrations

Apply SQL in `supabase/migrations/` to your project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or paste the migration files into the SQL editor in order (identity → courses → enrolments → certificates bucket).

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
