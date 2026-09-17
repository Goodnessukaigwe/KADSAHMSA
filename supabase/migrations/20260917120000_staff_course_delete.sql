-- Staff may delete a course that still has enrolments. Earlier migrations
-- already use ON DELETE CASCADE on course_id (certificates included) and
-- SET NULL on organisation_invites.course_id. This reasserts those FKs and
-- adds staff DELETE policies so a session-role cascade is not blocked by
-- "own row only" RLS on enrolments / progress / attempts / certificates.

do $$
declare
  rec record;
begin
  for rec in
    select con.conname, con.conrelid::regclass as rel
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'public.courses'::regclass
      and att.attname = 'course_id'
      and cardinality(con.conkey) = 1
  loop
    execute format('alter table %s drop constraint if exists %I', rec.rel, rec.conname);
  end loop;
end $$;

alter table public.enrolments
  add constraint enrolments_course_id_fkey
  foreign key (course_id) references public.courses (id) on delete cascade;

alter table public.course_progress
  add constraint course_progress_course_id_fkey
  foreign key (course_id) references public.courses (id) on delete cascade;

alter table public.quizzes
  add constraint quizzes_course_id_fkey
  foreign key (course_id) references public.courses (id) on delete cascade;

alter table public.certificates
  add constraint certificates_course_id_fkey
  foreign key (course_id) references public.courses (id) on delete cascade;

alter table public.course_lessons
  add constraint course_lessons_course_id_fkey
  foreign key (course_id) references public.courses (id) on delete cascade;

alter table public.enrolment_requests
  add constraint enrolment_requests_course_id_fkey
  foreign key (course_id) references public.courses (id) on delete cascade;

alter table public.organisation_invites
  add constraint organisation_invites_course_id_fkey
  foreign key (course_id) references public.courses (id) on delete set null;

drop policy if exists enrolments_delete_staff on public.enrolments;
create policy enrolments_delete_staff
  on public.enrolments for delete
  to authenticated
  using (public.is_staff());

drop policy if exists course_progress_delete_staff on public.course_progress;
create policy course_progress_delete_staff
  on public.course_progress for delete
  to authenticated
  using (public.is_staff());

drop policy if exists quiz_attempts_delete_staff on public.quiz_attempts;
create policy quiz_attempts_delete_staff
  on public.quiz_attempts for delete
  to authenticated
  using (public.is_staff());

drop policy if exists certificates_delete_staff on public.certificates;
create policy certificates_delete_staff
  on public.certificates for delete
  to authenticated
  using (public.is_staff());

drop policy if exists certificate_revocations_delete_staff on public.certificate_revocations;
create policy certificate_revocations_delete_staff
  on public.certificate_revocations for delete
  to authenticated
  using (public.is_staff());

grant delete on table public.quiz_attempts to authenticated;
grant delete on table public.certificates to authenticated;
grant delete on table public.certificate_revocations to authenticated;
