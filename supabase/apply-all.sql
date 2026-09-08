-- Apply in Supabase SQL Editor: https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
-- Concatenated Phase 1 migrations (identity → courses → enrolments → certificates bucket).

-- Identity: profiles, roles, user_roles, and Auth trigger.
-- RLS is defined here (not in supabase/policies/).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.roles (
  id text primary key,
  created_at timestamptz not null default now()
);

insert into public.roles (id) values
  ('learner'),
  ('org_admin'),
  ('content_admin'),
  ('super_admin');

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id text not null references public.roles (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index user_roles_user_id_idx on public.user_roles (user_id);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role_id in ('content_admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role_id = 'super_admin'
  );
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  insert into public.user_roles (user_id, role_id)
  values (new.id, 'learner')
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

create policy profiles_select_own_or_staff
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_staff());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy roles_select_authenticated
  on public.roles for select
  to authenticated
  using (true);

create policy user_roles_select_own_or_staff
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy user_roles_write_super_admin
  on public.user_roles for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select, update, insert on table public.profiles to authenticated;
grant select on table public.roles to authenticated;
grant select on table public.user_roles to authenticated;
grant insert, update, delete on table public.user_roles to authenticated;

-- ---------------------------------------------------------------------------
-- Thin catalogue for FKs. Lesson HTML stays in lib/content (Phases 3–6).

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'published'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create index courses_status_idx on public.courses (status);

insert into public.courses (slug, title, status) values
  ('dptc', 'Sensitization on Drug Use, Dependence & Prevention (DPTC)', 'published'),
  ('community-first-response', 'Community-Based Substance Abuse First Response', 'published'),
  ('human-rights-law-enforcement', 'Human Rights Frameworks in Law Enforcement & Care', 'published'),
  ('biological-drivers', 'Biological Drivers of Substance Dependence', 'published'),
  ('family-interventions', 'Family Interventions in Drug Treatment', 'published'),
  ('advocacy-programmes', 'Advocacy for Drug Prevention Programmes', 'published'),
  ('special-populations', 'Special Populations in Drug Care', 'published'),
  ('drug-screening', 'Drug Screening: Steps to Take', 'published'),
  ('drug-use-nigeria', 'The Drug Use Situation in Nigeria', 'published'),
  ('demand-harm-reduction', 'Demand and Harm Reduction', 'published'),
  ('types-of-treatment', 'Types of Drug Treatment', 'published'),
  ('law-enforcement-issues', 'Specific Issues for Law Enforcement', 'published'),
  ('trainer-resource-pack', 'DPTC Trainer Resource Pack', 'published'),
  ('organisation-cohort', 'Organisation Cohort: Facilitator Certification', 'published')
on conflict (slug) do update
  set title = excluded.title;

alter table public.courses enable row level security;

create policy courses_select_published_or_staff
  on public.courses for select
  to anon, authenticated
  using (status = 'published' or public.is_staff());

create policy courses_write_staff
  on public.courses for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on table public.courses to anon, authenticated;
grant insert, update, delete on table public.courses to authenticated;

-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Private certificates bucket stub. No uploads in this slice.

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;
