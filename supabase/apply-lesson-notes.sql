-- Private notes: each learner can write notes on any lesson page ("write your answer in your notes").
-- Only the learner can read or change their own notes.

create table if not exists public.lesson_notes (
  user_id uuid not null,
  course_slug text not null,
  lesson_slug text not null,
  body text not null default '' check (char_length(body) <= 10000),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_slug, lesson_slug)
);

alter table public.lesson_notes enable row level security;

grant select, insert, update on public.lesson_notes to authenticated;

create policy lesson_notes_select_own on public.lesson_notes
  for select to authenticated using (user_id = auth.uid());

create policy lesson_notes_insert_own on public.lesson_notes
  for insert to authenticated with check (user_id = auth.uid());

create policy lesson_notes_update_own on public.lesson_notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
