-- Phase 7: NDPA consent rows recorded at signup.
-- Apply via supabase/apply-phase7.sql in the SQL editor if you are not using db push.

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
