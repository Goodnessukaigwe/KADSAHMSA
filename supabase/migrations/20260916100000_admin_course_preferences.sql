create table public.admin_course_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  course_columns text[] not null default array[
    'title', 'status', 'slug', 'duration', 'image00', 'image01'
  ]::text[],
  updated_at timestamptz not null default now()
);

alter table public.admin_course_preferences enable row level security;

create policy admin_course_preferences_own
  on public.admin_course_preferences for all
  to authenticated
  using (user_id = auth.uid() and public.is_staff())
  with check (user_id = auth.uid() and public.is_staff());

grant select, insert, update, delete on table public.admin_course_preferences to authenticated;