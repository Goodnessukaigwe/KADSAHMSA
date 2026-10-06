-- The final assessment is every module quiz put together (done in code, so it always matches),
-- with a 60 minute timer. This gives every course with module quizzes a final row, and sets
-- the timer to 60 minutes on the finals that already exist. Safe to run more than once.

insert into public.quizzes (course_id, slug, kind, pass_mark_percent, max_attempts, time_limit_seconds)
select c.id, 'final', 'final', 80, 3, 3600
from public.courses c
where exists (
  select 1 from public.quizzes q where q.course_id = c.id and q.kind = 'module'
)
on conflict (course_id, slug) do nothing;

update public.quizzes set time_limit_seconds = 3600 where kind = 'final';
