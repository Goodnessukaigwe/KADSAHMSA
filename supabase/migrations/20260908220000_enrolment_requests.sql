-- Enrolment requests: learner asks, staff Enrol seats them.
-- Apply via supabase/apply-enrol-requests.sql in the SQL editor if you are not using db push.

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

drop policy if exists enrolments_insert_own on public.enrolments;

update public.courses
set status = 'draft'
where status = 'published'
  and (
    slug like 'p4-verify-%'
    or slug like 'p4b-verify-%'
    or slug like 'p6-media-%'
    or slug like 'cleanup-verify-%'
  );
