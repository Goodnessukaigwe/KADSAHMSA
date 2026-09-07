-- Optional. Seeds the old “returning learner” demo for a named test user.
-- Register that email first, then replace it below and run in the SQL editor.
-- Does not grant admin. Certificates stay out of this slice (Phase 3).

do $$
declare
  uid uuid;
  dptc_id uuid;
  hr_id uuid;
  cfr_id uuid;
begin
  select id into uid from auth.users where email = 'returning@example.com';
  if uid is null then
    raise exception 'Register that email first, then re-run this snippet.';
  end if;

  select id into dptc_id from public.courses where slug = 'dptc';
  select id into hr_id from public.courses where slug = 'human-rights-law-enforcement';
  select id into cfr_id from public.courses where slug = 'community-first-response';

  insert into public.enrolments (user_id, course_id)
  values (uid, dptc_id), (uid, hr_id), (uid, cfr_id)
  on conflict (user_id, course_id) do nothing;

  insert into public.course_progress (
    user_id, course_id, current_module, completed_indexes, player_seconds
  )
  values
    (uid, dptc_id, 9, array[1, 2, 3, 4, 5, 6, 7, 8], 73),
    (uid, hr_id, 2, array[1], 0),
    (uid, cfr_id, 6, array[1, 2, 3, 4, 5], 0)
  on conflict (user_id, course_id) do update
    set current_module = excluded.current_module,
        completed_indexes = excluded.completed_indexes,
        player_seconds = excluded.player_seconds;
end $$;
