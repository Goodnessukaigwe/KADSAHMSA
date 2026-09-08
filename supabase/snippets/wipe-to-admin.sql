-- Apply in Supabase SQL Editor (one-shot data wipe). Do not re-run casually.
-- https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
--
-- Fresh start: delete all courses, learner accounts, organisations,
-- and certificates. Leaves only goodnessukaigwe2020@gmail.com (plus
-- the empty schema) so you can register real students.
--
-- After the wipe, empty the certificates and course-media buckets in
-- Dashboard → Storage. Direct DELETE on storage.objects is blocked
-- (protect_delete); there is no Storage SQL helper that removes files.
-- Buckets stay. The final SELECT still reports remaining objects.
--
-- Data only. Schema, RLS, roles (learner / org_admin / content_admin /
-- super_admin), Auth trigger, and Storage buckets stay. TypeScript DPTC
-- quiz banks stay in the repo but are unused until a course exists again.
-- Existing KAD- verification ids stop working.
--
-- Post-wipe checks (also printed by the final SELECT):
--   1 auth user (goodnessukaigwe2020@gmail.com), 0 courses, 0 orgs,
--   0 enrolments, 0 certificates. storage_objects may still be
--   non-zero until you empty those two buckets in the Dashboard.
--   Then log out, log in as that admin, and open /admin.
--   /courses stays empty until you publish a course with a live lesson.
--   New signups create a learner only; enrol them from admin as today.
--
-- Delete order: organisation_invites and certificate_revocations
-- (those two FKs do not cascade) → organisations → all courses
-- (lessons, assets, quizzes, questions, enrolments, requests,
-- progress, attempts, certificates cascade) → other auth.users
-- (profiles, user_roles, consents cascade).

begin;

do $$
declare
  keep_email constant text := 'goodnessukaigwe2020@gmail.com';
begin
  if not exists (
    select 1 from auth.users where email = keep_email
  ) then
    raise exception
      'Keep-email % is missing from auth.users. Aborting wipe.',
      keep_email;
  end if;

  -- Buckets stay. Empty certificates and course-media in Dashboard →
  -- Storage after this wipe (SQL cannot delete storage objects).

  -- These two FKs do not cascade and would block auth.users deletes.
  delete from public.organisation_invites;
  delete from public.certificate_revocations;

  delete from public.organisations;
  delete from public.courses;

  delete from auth.users
  where email <> keep_email;
end $$;

-- Confirm in the SQL editor: one remaining email, zero catalogue/learner rows.
select
  (select coalesce(array_agg(email order by email), '{}') from auth.users)
    as remaining_emails,
  (select count(*) from auth.users) as auth_users,
  (
    select coalesce(array_agg(ur.role_id order by ur.role_id), '{}')
    from public.user_roles ur
    join auth.users u on u.id = ur.user_id
    where u.email = 'goodnessukaigwe2020@gmail.com'
  ) as keep_roles,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.user_roles) as user_roles,
  (select count(*) from public.consents) as consents,
  (select count(*) from public.courses) as courses,
  (select count(*) from public.organisations) as organisations,
  (select count(*) from public.enrolments) as enrolments,
  (select count(*) from public.enrolment_requests) as enrolment_requests,
  (select count(*) from public.certificates) as certificates,
  (select count(*) from public.certificate_revocations) as certificate_revocations,
  (select count(*) from public.organisation_invites) as organisation_invites,
  (
    select count(*)
    from storage.objects
    where bucket_id in ('certificates', 'course-media')
  ) as storage_objects;

commit;
