-- Apply in Supabase SQL Editor after Phase 1/2 (identity, courses, enrolments).
-- https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
-- Same SQL as supabase/migrations/20260908090000_quizzes_certificates.sql

-- Phase 3: quizzes, attempts, certificates, verify() RPC, Storage policy.
-- Questions stay in TypeScript. This slice seeds quiz rows only.

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null check (slug in ('module-1', 'final')),
  kind text not null check (kind in ('module', 'final')),
  pass_mark_percent smallint not null default 70
    check (pass_mark_percent between 1 and 100),
  max_attempts smallint not null default 3
    check (max_attempts > 0),
  time_limit_seconds integer,
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);

create index if not exists quizzes_course_id_idx on public.quizzes (course_id);

create unique index if not exists quizzes_one_final_per_course
  on public.quizzes (course_id)
  where kind = 'final';

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  enrolment_id uuid not null references public.enrolments (id) on delete cascade,
  attempt_no smallint not null check (attempt_no > 0),
  answers integer[],
  score_percent smallint,
  passed boolean,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, quiz_id, attempt_no)
);

create index if not exists quiz_attempts_user_quiz_idx
  on public.quiz_attempts (user_id, quiz_id);
create index if not exists quiz_attempts_enrolment_idx
  on public.quiz_attempts (enrolment_id, quiz_id);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolment_id uuid not null unique references public.enrolments (id) on delete cascade,
  verification_id text not null unique,
  score_percent smallint not null,
  issued_at timestamptz not null default now(),
  status text not null default 'valid' check (status in ('valid', 'revoked')),
  storage_path text not null
);

create index if not exists certificates_user_id_idx on public.certificates (user_id);
create index if not exists certificates_status_idx
  on public.certificates (status, issued_at desc);

create table if not exists public.certificate_revocations (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates (id) on delete cascade,
  reason text not null,
  revoked_by uuid not null references auth.users (id),
  revoked_at timestamptz not null default now()
);

create index if not exists certificate_revocations_cert_idx
  on public.certificate_revocations (certificate_id);

insert into public.quizzes (
  course_id, slug, kind, pass_mark_percent, max_attempts, time_limit_seconds
)
select c.id, 'module-1', 'module', 70, 3, 1800
from public.courses c
where c.slug = 'dptc'
on conflict (course_id, slug) do update
  set kind = excluded.kind,
      pass_mark_percent = excluded.pass_mark_percent,
      max_attempts = excluded.max_attempts,
      time_limit_seconds = excluded.time_limit_seconds;

insert into public.quizzes (
  course_id, slug, kind, pass_mark_percent, max_attempts, time_limit_seconds
)
select c.id, 'final', 'final', 70, 3, 1800
from public.courses c
where c.slug = 'dptc'
on conflict (course_id, slug) do update
  set kind = excluded.kind,
      pass_mark_percent = excluded.pass_mark_percent,
      max_attempts = excluded.max_attempts,
      time_limit_seconds = excluded.time_limit_seconds;

create or replace function public.verify_certificate(p_id text)
returns table (
  status text,
  learner_name text,
  course_title text,
  issued_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.status,
    coalesce(nullif(trim(p.full_name), ''), 'Learner') as learner_name,
    co.title as course_title,
    c.issued_at
  from public.certificates c
  join public.courses co on co.id = c.course_id
  left join public.profiles p on p.id = c.user_id
  where upper(c.verification_id) = upper(trim(p_id));
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_revocations enable row level security;

drop policy if exists quizzes_select_authenticated on public.quizzes;
create policy quizzes_select_authenticated
  on public.quizzes for select
  to authenticated
  using (true);

drop policy if exists quiz_attempts_select_own_or_staff on public.quiz_attempts;
create policy quiz_attempts_select_own_or_staff
  on public.quiz_attempts for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists quiz_attempts_insert_own_draft on public.quiz_attempts;
create policy quiz_attempts_insert_own_draft
  on public.quiz_attempts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and score_percent is null
    and passed is null
    and submitted_at is null
  );

drop policy if exists quiz_attempts_update_own_draft on public.quiz_attempts;
create policy quiz_attempts_update_own_draft
  on public.quiz_attempts for update
  to authenticated
  using (user_id = auth.uid() and submitted_at is null)
  with check (
    user_id = auth.uid()
    and score_percent is null
    and passed is null
    and submitted_at is null
  );

drop policy if exists certificates_select_own_or_staff on public.certificates;
create policy certificates_select_own_or_staff
  on public.certificates for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists certificate_revocations_select_staff on public.certificate_revocations;
create policy certificate_revocations_select_staff
  on public.certificate_revocations for select
  to authenticated
  using (public.is_staff());

grant select on table public.quizzes to authenticated;
grant select, insert, update on table public.quiz_attempts to authenticated;
grant select on table public.certificates to authenticated;
grant select on table public.certificate_revocations to authenticated;

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do update set public = false;

drop policy if exists certificates_objects_select_own on storage.objects;
create policy certificates_objects_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'certificates'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_staff()
    )
  );
