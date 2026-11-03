-- Quick feedback after each module, required with the survey before a certificate download.
-- Safe to run more than once.

create table if not exists public.module_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  module_index integer not null check (module_index >= 0),
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  page_path text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, course_id, module_index)
);

create index if not exists module_feedback_course_idx on public.module_feedback (course_id, module_index);

alter table public.module_feedback enable row level security;

drop policy if exists module_feedback_select on public.module_feedback;
create policy module_feedback_select on public.module_feedback
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
