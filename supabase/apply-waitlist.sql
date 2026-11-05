-- Course waitlist: anyone can ask to be considered; staff give access from the admin.
-- Safe to run more than once.

create table if not exists public.course_waitlist (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  organisation text not null default '',
  note text not null default '',
  status text not null default 'waiting' check (status in ('waiting', 'invited')),
  created_at timestamptz not null default now()
);

create unique index if not exists course_waitlist_course_email_idx
  on public.course_waitlist (course_id, email);
create index if not exists course_waitlist_status_idx
  on public.course_waitlist (course_id, status, created_at desc);

-- Locked down: the website writes through the server, staff read through the server.
alter table public.course_waitlist enable row level security;
