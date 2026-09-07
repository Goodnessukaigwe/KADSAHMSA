-- Learning: enrolments and course progress (Phase 2 start).

create table public.enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index enrolments_user_id_idx on public.enrolments (user_id);
create index enrolments_course_id_idx on public.enrolments (course_id);

create table public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  current_module integer not null default 1,
  completed_indexes integer[] not null default '{}',
  player_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index course_progress_user_id_idx on public.course_progress (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger course_progress_set_updated_at
  before update on public.course_progress
  for each row execute procedure public.set_updated_at();

alter table public.enrolments enable row level security;
alter table public.course_progress enable row level security;

create policy enrolments_select_own_or_staff
  on public.enrolments for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy enrolments_insert_own
  on public.enrolments for insert
  to authenticated
  with check (user_id = auth.uid());

create policy enrolments_update_own
  on public.enrolments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy enrolments_delete_own
  on public.enrolments for delete
  to authenticated
  using (user_id = auth.uid());

create policy course_progress_select_own_or_staff
  on public.course_progress for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy course_progress_insert_own
  on public.course_progress for insert
  to authenticated
  with check (user_id = auth.uid());

create policy course_progress_update_own
  on public.course_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy course_progress_delete_own
  on public.course_progress for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on table public.enrolments to authenticated;
grant select, insert, update, delete on table public.course_progress to authenticated;
