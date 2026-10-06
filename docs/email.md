# Email (Resend)

The app sends transactional email through [Resend](https://resend.com). Until it is
configured every email is skipped and the app behaves exactly as before.

## Set it up

1. **API key.** In Resend, create an API key (Sending access). Add it in Vercel as
   `RESEND_API_KEY`.
2. **Sending domain.** In Resend → Domains, add the domain you will send from and add the DNS
   records it shows (SPF, DKIM). Wait until it shows *Verified*.
3. **Sender.** Add `MAIL_FROM` in Vercel, for example
   `KADSAMHSA Academy <academy@yourdomain.org>`. The address must be on the verified domain.
4. **Site address.** Add `SITE_URL` (for example `https://lms.kadsamhsa.kdsg.gov.ng`, no trailing
   slash). Links inside emails use it.
5. Add the variables for **Production and Preview**, then **redeploy**.

## What is sent

| Email | When |
|---|---|
| Confirm your email | A new person signs up (public sign-up) |
| Reset your password | "Forgot password" |
| You are enrolled | A learner is newly enrolled in a course |
| Your certificate (PDF attached) | A certificate is issued |

All are branded, have a plain-text twin, and never block the action they belong to
(except the confirmation email, see below).

## Email confirmation at sign-up

When email is configured, public sign-up creates an **unconfirmed** account and emails a link.
The person is signed in when they open it. Until then they cannot log in; the login screen
offers to send the link again.

- If the confirmation email cannot be sent, the account is not kept, so the person can retry.
- **Existing accounts are not affected.** Everyone who already has an account is confirmed,
  including the super admin, and keeps logging in with email and password.
- Accounts created by staff (organisation CSV, importers) are confirmed on creation.
- Unconfirmed accounts that hold an admin role (`super_admin`, `content_admin`, `org_admin`) can
  still log in with email and password. Self-registered learners must confirm by email.
- Password reset also goes through Resend when configured; otherwise it uses Supabase's built-in
  email as before.

## Without Resend

If `RESEND_API_KEY` or `MAIL_FROM` is missing, sign-up confirms the account immediately and
signs the person in (the previous behaviour), reset emails come from Supabase, and no other
email is sent.
