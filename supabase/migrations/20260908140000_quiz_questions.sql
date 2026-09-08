-- Phase 4b: any-course final quiz + quiz_questions.
-- Relax quizzes.slug (keep one final per course). Learners never select correct_index.

do $$
declare
  rec record;
begin
  for rec in
    select conname
    from pg_constraint
    where conrelid = 'public.quizzes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%module-1%'
  loop
    execute format('alter table public.quizzes drop constraint if exists %I', rec.conname);
  end loop;
end $$;

alter table public.quizzes drop constraint if exists quizzes_slug_check;
alter table public.quizzes
  add constraint quizzes_slug_check
  check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 64
  );

drop policy if exists quizzes_write_staff on public.quizzes;
create policy quizzes_write_staff
  on public.quizzes for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant insert, update, delete on table public.quizzes to authenticated;

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position integer not null check (position > 0),
  prompt text not null,
  options text[] not null
    check (cardinality(options) >= 2 and cardinality(options) <= 6),
  correct_index smallint not null
    check (correct_index >= 0 and correct_index < cardinality(options)),
  created_at timestamptz not null default now(),
  unique (quiz_id, position)
);

create index if not exists quiz_questions_quiz_id_idx
  on public.quiz_questions (quiz_id, position);

alter table public.quiz_questions enable row level security;

drop policy if exists quiz_questions_select_authenticated on public.quiz_questions;
create policy quiz_questions_select_authenticated
  on public.quiz_questions for select
  to authenticated
  using (true);

drop policy if exists quiz_questions_write_staff on public.quiz_questions;
create policy quiz_questions_write_staff
  on public.quiz_questions for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on table public.quiz_questions from anon, authenticated;
-- Learners may read prompt/options only. Scoring uses the service role.
grant select (id, quiz_id, position, prompt, options, created_at)
  on table public.quiz_questions to authenticated;
grant insert, update, delete on table public.quiz_questions to authenticated;
