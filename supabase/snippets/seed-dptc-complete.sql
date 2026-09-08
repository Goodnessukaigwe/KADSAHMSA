-- Marks all 13 DPTC modules complete for a test user so the final assessment unlocks.
-- Register the email first, then replace it below and run in the SQL editor.

do $$
declare
  uid uuid;
  dptc_id uuid;
begin
  select id into uid from auth.users where email = 'you@example.com';
  if uid is null then
    raise exception 'Register that email first, then re-run this snippet.';
  end if;

  select id into dptc_id from public.courses where slug = 'dptc';
  if dptc_id is null then
    raise exception 'DPTC course row is missing. Apply Phase 1/2 SQL first.';
  end if;

  insert into public.enrolments (user_id, course_id)
  values (uid, dptc_id)
  on conflict (user_id, course_id) do nothing;

  insert into public.course_progress (
    user_id, course_id, current_module, completed_indexes, player_seconds
  )
  values (uid, dptc_id, 14, array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 0)
  on conflict (user_id, course_id) do update
    set current_module = excluded.current_module,
        completed_indexes = excluded.completed_indexes;
end $$;
