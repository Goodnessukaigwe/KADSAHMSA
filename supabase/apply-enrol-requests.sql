-- Apply in Supabase SQL Editor after production cleanup.
-- https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
-- Same SQL as supabase/migrations/20260908220000_enrolment_requests.sql
--
-- Learners request a seat. Staff Enrol (or enrol-by-email) creates the real
-- enrolment. A request row grants no lesson, quiz, or media access.
-- Also unpublishes leftover phase-verify courses. Does not delete rows that
-- have enrolments or certificates. DPTC stays draft. KAD- verify is unchanged.

create table if not exists public.enrolment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists enrolment_requests_user_id_idx
  on public.enrolment_requests (user_id);

create index if not exists enrolment_requests_course_id_idx
  on public.enrolment_requests (course_id);

alter table public.enrolment_requests enable row level security;

drop policy if exists enrolment_requests_select_own_or_staff on public.enrolment_requests;
create policy enrolment_requests_select_own_or_staff
  on public.enrolment_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists enrolment_requests_insert_own on public.enrolment_requests;
create policy enrolment_requests_insert_own
  on public.enrolment_requests for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists enrolment_requests_delete_staff on public.enrolment_requests;
create policy enrolment_requests_delete_staff
  on public.enrolment_requests for delete
  to authenticated
  using (public.is_staff());

revoke all on table public.enrolment_requests from anon, authenticated;
grant select, insert on table public.enrolment_requests to authenticated;
grant delete on table public.enrolment_requests to authenticated;

-- Learners must not create their own enrolment rows. Staff enrol via the
-- service role (enrolLearnerWithAdmin).
drop policy if exists enrolments_insert_own on public.enrolments;

-- Unpublish leftover verify/demo courses. Keep the rows if they have
-- enrolments or certificates so KAD- ids keep resolving.
update public.courses
set status = 'draft'
where status = 'published'
  and (
    slug like 'p4-verify-%'
    or slug like 'p4b-verify-%'
    or slug like 'p6-media-%'
    or slug like 'cleanup-verify-%'
  );
