# Migration blueprint

Moving from the Moodle 4.5 stack in `../KADSAHMSA` to this platform. Moodle stays
authoritative until step 5.

## 1. Freeze and inventory

Export from Moodle: courses, users, enrolments, quiz attempts, completion
records, certificates, organisations (cohorts), and file metadata. Record source
row counts and content hashes for every export.

Nothing in Moodle is deleted at any point in this process. The database and
`moodledata` backups are retained for the agreed period after cutover.

Inventory checklist per entity:

| Entity | Moodle source | Target | Notes |
|---|---|---|---|
| Users | `mdl_user` | `users` | Passwords are not copied — see below. |
| Courses | `mdl_course` | `courses` | `id` preserved in `legacy_moodle_id`. |
| Modules/lessons | `mdl_course_sections`, `mdl_course_modules` | `modules`, `lessons` | Slide/PDF resources become content blocks. |
| Enrolments | `mdl_user_enrolments` | `enrolments` | Enrolment date and status preserved. |
| Completion | `mdl_course_completions`, `mdl_course_modules_completion` | `course_progress`, `lesson_progress` | Completion timestamps are evidence — carry them exactly. |
| Quiz attempts | `mdl_quiz_attempts`, `mdl_question_attempts` | `quiz_attempts`, `quiz_answers` | Needed to justify already-issued certificates. |
| Certificates | `mdl_customcert_issues` | `certificates` | **Verification IDs must survive unchanged.** |
| Files | `mdl_files` + `moodledata` | object storage | Sample-checksum verified. |

## 2. Build alongside

The React public site currently reads courses from a Moodle web service; that
call moves to `GET /courses` on the new API. New learner and staff workflows are
delivered as end-to-end vertical slices, not layer by layer.

## 3. Import and reconcile

Import jobs are repeatable and support `--dry-run`. Every imported row keeps its
origin in a `legacy_moodle_id` column, so a re-run updates rather than
duplicates.

Reconcile before proceeding:

- Row counts per entity match the step-1 inventory.
- Completion statuses match per user per course.
- Every existing certificate verification ID resolves on the new public
  verification endpoint and returns the same learner name, course, and issue
  date.
- Sampled file checksums match.

Any mismatch blocks cutover. Reconciliation output is archived with the release.

## 4. Pilot

Enable the new application for internal staff and one approved organisation on
staging. Exercise, end to end: enrolment, learning, assessment, certificate
issuance, payment webhook, and CSV export.

## 5. Cut over

1. Put Moodle in read-only mode.
2. Run a final delta import and re-run reconciliation.
3. Redirect public links — `/theme/kadsamhsa/courses.php` → `/courses`,
   `/theme/kadsamhsa/about.php` → `/about`, `/mod/customcert/verify_certificate.php`
   → `/verify` — with 301s, preserving certificate verification query parameters.
4. Retain Moodle and database backups for the agreed retention period.

Decommission only after acceptance sign-off **and** a tested restore of both the
database backup and the object store.

## Passwords

Moodle password hashes cannot be safely copied unless the new authentication
service deliberately supports Moodle's hash format. The default here is the
safer one: accounts are imported without credentials, and every migrated user
gets a mandatory password-reset email at first sign-in. This needs to be stated
in the cutover communication, because every existing learner is affected.

## Open approvals

Required from KADSAMHSA before development proceeds past M1:

- Production domain
- Transactional email provider
- Object-storage provider
- NDPA privacy text
- Certificate wording and signatories
- Paystack account ownership
- Final course/learner data migration policy (in particular, whether historical
  quiz attempts are migrated or archived)
