-- Learner feedback survey, required before a certificate can be downloaded.
-- Safe to run more than once.

create table if not exists public.course_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  overall smallint not null check (overall between 1 and 5),
  ease_of_use smallint not null check (ease_of_use between 1 and 5),
  content_quality smallint not null check (content_quality between 1 and 5),
  mobile_experience smallint not null check (mobile_experience between 1 and 5),
  recommend smallint not null check (recommend between 0 and 10),
  enjoyed text not null default '',
  improve text not null default '',
  had_problems boolean not null default false,
  problems text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists course_feedback_course_idx on public.course_feedback (course_id, created_at desc);

alter table public.course_feedback enable row level security;

-- Learners read their own answers; staff read everything. All writes go through the server.
drop policy if exists course_feedback_select on public.course_feedback;
create policy course_feedback_select on public.course_feedback
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
