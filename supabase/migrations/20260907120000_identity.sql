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
