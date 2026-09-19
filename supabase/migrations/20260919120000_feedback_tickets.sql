-- Feedback tickets: public FAB submits via service role; staff triage in /admin/feedback.
-- Apply via supabase/apply-feedback.sql in the SQL editor if you are not using db push.

create table if not exists public.feedback_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  submitter_name text not null,
  submitter_email text not null default '',
  is_anonymous boolean not null default false,
  category text not null check (category in ('broken', 'access', 'quiz_cert', 'other')),
  message text not null check (char_length(message) between 20 and 2000),
  page_path text not null default '/',
  status text not null default 'open' check (status in ('open', 'resolved')),
  read_at timestamptz,
  resolved_at timestamptz
);

create index if not exists feedback_tickets_created_at_idx
  on public.feedback_tickets (created_at desc);

create index if not exists feedback_tickets_unread_idx
  on public.feedback_tickets (created_at desc)
  where read_at is null;

create index if not exists feedback_tickets_status_idx
  on public.feedback_tickets (status);

alter table public.feedback_tickets enable row level security;

drop policy if exists feedback_tickets_select_staff on public.feedback_tickets;
create policy feedback_tickets_select_staff
  on public.feedback_tickets for select
  to authenticated
  using (public.is_staff());

drop policy if exists feedback_tickets_update_staff on public.feedback_tickets;
create policy feedback_tickets_update_staff
  on public.feedback_tickets for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- No client insert. Anonymous and named tickets go through createAdminClient().
revoke all on table public.feedback_tickets from anon, authenticated;
grant select, update on table public.feedback_tickets to authenticated;
