-- Resume lesson + optional per-module quizzes.
-- quizzes.slug becomes free text (module-{n} or final). module_id links a
-- module quiz to course_modules. DPTC module-1 / final stay slug-keyed.
-- Apply in Supabase SQL Editor. Do not rewrite earlier migrations.

alter table public.course_progress
  add column if not exists resume_lesson_slug text;

alter table public.quizzes
  add column if not exists module_id uuid references public.course_modules (id) on delete cascade;

alter table public.quizzes
  drop constraint if exists quizzes_slug_check;

alter table public.quizzes
  add constraint quizzes_slug_check check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 64
  );

create unique index if not exists quizzes_one_per_module
  on public.quizzes (module_id)
  where module_id is not null;

create index if not exists quizzes_module_id_idx
  on public.quizzes (module_id);

-- Attach DPTC module-1 to the introduction module when that row exists.
update public.quizzes q
set module_id = m.id
from public.courses c
join public.course_modules m
  on m.course_id = c.id
 and m.slug = 'introduction'
where q.course_id = c.id
  and c.slug = 'dptc'
  and q.slug = 'module-1'
  and q.module_id is null;
