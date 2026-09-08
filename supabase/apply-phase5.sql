-- Apply in Supabase SQL Editor after Phase 4b.
-- https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
-- Same SQL as supabase/migrations/20260908160000_organisations.sql
--
-- Phase 5: organisations, memberships, invites, org-scoped RLS helpers.
-- Seat limit is a staff-set integer (not paid seats). Cross-org select must fail.

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  seat_limit integer not null default 10
    check (seat_limit >= 0),
  created_at timestamptz not null default now()
);

create index if not exists organisations_status_idx
  on public.organisations (status, created_at desc);

create table if not exists public.organisation_memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  unique (organisation_id, user_id)
);

create index if not exists organisation_memberships_org_idx
  on public.organisation_memberships (organisation_id, role);
create index if not exists organisation_memberships_user_idx
  on public.organisation_memberships (user_id);

create table if not exists public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  code text not null unique check (char_length(code) between 12 and 64),
  course_id uuid references public.courses (id) on delete set null,
  expires_at timestamptz,
  created_by uuid not null references auth.users (id),
  uses integer not null default 0 check (uses >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  created_at timestamptz not null default now()
);

create index if not exists organisation_invites_org_idx
  on public.organisation_invites (organisation_id, created_at desc);
create index if not exists organisation_invites_code_idx
  on public.organisation_invites (code);

create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organisation_memberships
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_org_admin_of(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_org_id is not null and exists (
    select 1
    from public.organisation_memberships
    where organisation_id = p_org_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_org_id is not null and exists (
    select 1
    from public.organisation_memberships
    where organisation_id = p_org_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin_for_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user_id is not null and exists (
    select 1
    from public.organisation_memberships mine
    join public.organisation_memberships theirs
      on theirs.organisation_id = mine.organisation_id
    where mine.user_id = auth.uid()
      and mine.role = 'admin'
      and theirs.user_id = p_user_id
  );
$$;

create or replace function public.enforce_org_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_count integer;
  used_count integer;
begin
  select seat_limit into limit_count
  from public.organisations
  where id = new.organisation_id;

  if limit_count is null then
    raise exception 'That organisation was not found.';
  end if;

  select count(*) into used_count
  from public.organisation_memberships
  where organisation_id = new.organisation_id;

  if used_count >= limit_count then
    raise exception 'No seats left for this organisation.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists organisation_memberships_seat_limit on public.organisation_memberships;
create trigger organisation_memberships_seat_limit
  before insert on public.organisation_memberships
  for each row execute procedure public.enforce_org_seat_limit();

revoke all on function public.is_org_admin() from public;
revoke all on function public.is_org_admin_of(uuid) from public;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_admin_for_user(uuid) from public;
revoke all on function public.enforce_org_seat_limit() from public;

grant execute on function public.is_org_admin() to anon, authenticated;
grant execute on function public.is_org_admin_of(uuid) to anon, authenticated;
grant execute on function public.is_org_member(uuid) to anon, authenticated;
grant execute on function public.is_org_admin_for_user(uuid) to anon, authenticated;

alter table public.organisations enable row level security;
alter table public.organisation_memberships enable row level security;
alter table public.organisation_invites enable row level security;

drop policy if exists organisations_select_staff_or_admin on public.organisations;
create policy organisations_select_staff_or_admin
  on public.organisations for select
  to authenticated
  using (public.is_staff() or public.is_org_admin_of(id));

drop policy if exists organisations_write_staff on public.organisations;
create policy organisations_write_staff
  on public.organisations for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists organisation_memberships_select on public.organisation_memberships;
create policy organisation_memberships_select
  on public.organisation_memberships for select
  to authenticated
  using (
    public.is_staff()
    or user_id = auth.uid()
    or public.is_org_admin_of(organisation_id)
  );

drop policy if exists organisation_memberships_write on public.organisation_memberships;
create policy organisation_memberships_write
  on public.organisation_memberships for all
  to authenticated
  using (public.is_staff() or public.is_org_admin_of(organisation_id))
  with check (public.is_staff() or public.is_org_admin_of(organisation_id));

drop policy if exists organisation_invites_select on public.organisation_invites;
create policy organisation_invites_select
  on public.organisation_invites for select
  to authenticated
  using (public.is_staff() or public.is_org_admin_of(organisation_id));

drop policy if exists organisation_invites_write on public.organisation_invites;
create policy organisation_invites_write
  on public.organisation_invites for all
  to authenticated
  using (public.is_staff() or public.is_org_admin_of(organisation_id))
  with check (public.is_staff() or public.is_org_admin_of(organisation_id));

drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_staff()
    or public.is_org_admin_for_user(id)
  );

drop policy if exists enrolments_select_own_or_staff on public.enrolments;
create policy enrolments_select_own_or_staff
  on public.enrolments for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.is_org_admin_for_user(user_id)
  );

drop policy if exists course_progress_select_own_or_staff on public.course_progress;
create policy course_progress_select_own_or_staff
  on public.course_progress for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.is_org_admin_for_user(user_id)
  );

drop policy if exists quiz_attempts_select_own_or_staff on public.quiz_attempts;
create policy quiz_attempts_select_own_or_staff
  on public.quiz_attempts for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.is_org_admin_for_user(user_id)
  );

drop policy if exists certificates_select_own_or_staff on public.certificates;
create policy certificates_select_own_or_staff
  on public.certificates for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or public.is_org_admin_for_user(user_id)
  );

revoke all on table public.organisations from anon, authenticated;
revoke all on table public.organisation_memberships from anon, authenticated;
revoke all on table public.organisation_invites from anon, authenticated;

grant select, insert, update, delete on table public.organisations to authenticated;
grant select, insert, update, delete on table public.organisation_memberships to authenticated;
grant select, insert, update, delete on table public.organisation_invites to authenticated;
