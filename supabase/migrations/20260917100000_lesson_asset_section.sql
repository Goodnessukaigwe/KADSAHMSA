-- Place a lesson image on Introduction, Main Content, or Additional Notes.
-- Cover photos stay on courses.cover_path. Null section keeps extra files
-- (PDF, video, older unsectioned images) in the leftover media list.

alter table public.lesson_assets
  add column if not exists section text;

alter table public.lesson_assets
  drop constraint if exists lesson_assets_section_chk;

alter table public.lesson_assets
  add constraint lesson_assets_section_chk
  check (section is null or section in ('introduction', 'main', 'notes'));

create index if not exists lesson_assets_lesson_section_idx
  on public.lesson_assets (lesson_id, section);
