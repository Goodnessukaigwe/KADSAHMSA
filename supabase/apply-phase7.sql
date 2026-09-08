-- Apply in Supabase SQL Editor after Phase 6.
-- https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
-- Same SQL as supabase/migrations/20260908200000_consents.sql
--
-- Phase 7: consents table for NDPA signup records.
-- The app writes rows with the service role after an unticked checkbox.
-- Learners and staff may read; inserts are server-only (no insert policy).

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_key text not null,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, policy_key, policy_version)
);

create index if not exists consents_user_id_idx
  on public.consents (user_id, accepted_at desc);

alter table public.consents enable row level security;

drop policy if exists consents_select_own_or_staff on public.consents;
create policy consents_select_own_or_staff
  on public.consents for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

revoke all on table public.consents from anon, authenticated;
grant select on table public.consents to authenticated;
