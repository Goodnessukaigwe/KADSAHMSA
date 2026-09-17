-- Access-only unenrol: keep the enrolment row (progress, quizzes, certificates)
-- and mark the seat inactive. Unique (user_id, course_id) stays so re-enrol
-- reactivates the same seat.

alter table public.enrolments
  add column if not exists status text not null default 'active';

alter table public.enrolments
  add column if not exists unenrolled_at timestamptz;

alter table public.enrolments
  drop constraint if exists enrolments_status_chk;

alter table public.enrolments
  add constraint enrolments_status_chk
  check (status in ('active', 'unenrolled'));

update public.enrolments
set status = 'active'
where status is null or status not in ('active', 'unenrolled');

-- Learners must not flip their own seat back to active.
drop policy if exists enrolments_update_own on public.enrolments;

drop policy if exists enrolments_update_staff on public.enrolments;
create policy enrolments_update_staff
  on public.enrolments for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Signed media metadata must not leak to unenrolled learners.
drop policy if exists lesson_assets_select_enrolled_or_staff on public.lesson_assets;
create policy lesson_assets_select_enrolled_or_staff
  on public.lesson_assets for select
  to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.course_lessons l
      join public.enrolments e on e.course_id = l.course_id
      where l.id = lesson_assets.lesson_id
        and e.user_id = auth.uid()
        and e.status = 'active'
    )
  );
