# UAT script (KADSAMHSA staff + pilot org)

Use this when staff and a pilot organisation are ready. It is a **script**, not a sign-off. Leave the Phase 7 UAT box unchecked until a named staff member and a pilot admin have walked it and written pass/fail.

Environment: staging or local (`npm run dev`). Production on the KADSAMHSA domain is a later step.

Apply SQL first if tables are missing: `apply-all.sql` → phase 3 → 4 → 4b → 5 → 6 → [`apply-phase7.sql`](../supabase/apply-phase7.sql). After Phase 7, paste [`apply-production-cleanup.sql`](../supabase/apply-production-cleanup.sql) so seed catalogue rows are unpublished or removed, then [`apply-enrol-requests.sql`](../supabase/apply-enrol-requests.sql) for request-then-admin enrol. Existing `KAD-` certificates still verify.

## 1. Learner

| # | Step | Expected |
|---|------|----------|
| 1.1 | Open `/register`. Leave the privacy box **unticked** and submit. | Signup refused. No account. |
| 1.2 | Tick the box (link opens `/privacy`). Submit. | Account created. A `consents` row exists for that user (`privacy` / `2026-09-08-draft`). |
| 1.3 | Open `/courses`, request enrolment on a **free** published course with a live lesson or uploaded media. Confirm `/learn/...` redirects back to the course page. Staff Enrol on that course’s Learners list. | Request is pending until staff Enrol. Then the course appears on `/my` and `/my/courses`, and lessons open. |
| 1.4 | Open a lesson with text and, if attached, PDF / image / audio / uploaded video. | Content reads. Signed media plays or downloads. Unenrolled users cannot get a signed URL. |
| 1.5 | Open a lesson with a YouTube or Vimeo URL. | Embed plays (CSP must allow youtube-nocookie and `player.vimeo.com`). |
| 1.6 | Take a module quiz and/or the final (DPTC: Module 1 + final). Fail once, then pass (≥70%). | Score, retries, and pass mark behave as labelled. |
| 1.7 | After every live lesson + passing final, open `/certificates`. | One PDF, unique `KAD-` id. Second issue does not duplicate. |
| 1.8 | Open `/verify`, enter the id. | Only validity, name, course, date. No email, score, or file URL. |

## 2. Staff (content admin or super admin)

| # | Step | Expected |
|---|------|----------|
| 2.1 | Grant a staff role (`supabase/snippets/grant-super-admin.sql` or Users). Open `/admin`. | Dashboard loads. A learner is redirected to `/my`. |
| 2.2 | Course builder: create or edit a course, **Save**, **Preview**, **Publish**. | Catalogue shows the published course. Shareable `/courses/[slug]` works. |
| 2.3 | On a saved lesson, upload a small image or PDF and attach a YouTube or Vimeo URL. | Assets list updates. Learner in §1.4–1.5 can open them. |
| 2.4 | Course **Learners** roster: enrol a registered email. | Learner sees the course. Progress shows after they study. |
| 2.5 | Narrow the builder to **375px** width (or a phone). | Course list is reachable (drawer). Save / Publish / upload controls are not clipped off-screen. |

## 3. Organisation

| # | Step | Expected |
|---|------|----------|
| 3.1 | Staff approve an organisation and set a seat limit. Create an invite code or link. | `/join` accepts the code for a new or existing learner. |
| 3.2 | Org admin CSV-enrols a short staff list onto a course (within seats). | Members appear. Over-seat rows are refused with a clear error. |
| 3.3 | Org admin opens `/org` reports. | Only that org’s staff, enrolments, quizzes, and certs. No other org’s names. |
| 3.4 | A second org admin (or a learner) tries the first org’s id in the URL. | Server + RLS refuse. No cross-org table. |

## 4. After the pass

- Record date, environment URL, staff name, pilot org name, and defects (severity + page).
- Critical / major defects block the Phase 7 **UAT sign-off** checkbox in `PHASES_v2.md`.
- Do not treat a vendor walkthrough as KADSAMHSA sign-off.
