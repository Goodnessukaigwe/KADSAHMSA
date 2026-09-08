# Security checklist

Engineering checklist for launch hardening. Tick what is true on the current build. Items blocked on a production domain stay open.

## Transport and hosting

- [ ] HTTPS on the KADSAMHSA production domain — **blocked on DNS**. No custom domain and no production cutover in this slice.
- [ ] HSTS — **blocked on DNS**. Do not send `Strict-Transport-Security` until the live hostname is HTTPS.
- [x] Local / preview can stay `http://localhost` (no `upgrade-insecure-requests` in CSP).

## Secrets

- [x] Supabase service-role, Paystack secret, webhook secret, and Resend stay out of `NEXT_PUBLIC_*` (see `.env.example`).
- [x] Only publishable values are prefixed `NEXT_PUBLIC_`: Supabase URL, anon key, and (later) Paystack public key.
- [x] Server Actions and Route Handlers use the service-role client on the server only.

## Access control

- [x] Postgres RLS on identity, catalogue, enrolments, quizzes, certificates, organisations, lesson assets, and consents.
- [x] Server checks are load-bearing: `requireUser`, `requireStaff`, `requireOrgAdmin` on actions and handlers.
- [x] `/admin` and `/org` middleware redirects refuse the wrong role.
- [x] Org admins see only their membership; staff can cross orgs.

## Storage and certificates

- [x] Certificate PDFs and course media live in **private** buckets. Learners get time-limited signed URLs after a server check.
- [x] Public `/verify` is not a file listing. It returns only validity, learner name, course title, and issue date.

## Browser headers (this slice)

- [x] `X-Content-Type-Options: nosniff`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` disables camera, microphone, geolocation, payment, USB
- [x] `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`
- [x] CSP without `unsafe-eval`. Lesson iframes allowed for `https://www.youtube-nocookie.com` and `https://player.vimeo.com`. Signed media from `*.supabase.co`.

## NDPA (draft)

- [x] Public `/privacy` describes what we collect, why, verify-page minimization, and how to ask for deletion.
- [x] Register checkbox starts **unticked**. Server refuses signup without it and writes a `consents` row (`policy_key`, `policy_version`, `accepted_at`).
- [ ] Lawyer-approved NDPA policy text and a named compliance owner — **open**. The privacy page is marked draft. Do not treat it as a legal sign-off.

## Payments (Phase 9)

- [ ] Paystack webhook signature verification — **not built**. When F9 lands, verify the webhook secret on the server; never put it in `NEXT_PUBLIC_*`.

## OWASP intent (current)

| Area | Status |
|------|--------|
| Injection | Parameterized Supabase queries; no raw SQL from the browser |
| Auth | Email/password via Supabase Auth; password reset after login |
| Sensitive data | Service-role and payment secrets server-only; verify page minimized |
| XSS | React escaping + CSP (inline scripts still needed for Next.js hydration) |
| Access control | RLS + server role checks |
| CSRF | Next.js Server Actions cookie/origin checks |
| Known components | Keep Next.js and `@supabase/*` updated before production |
