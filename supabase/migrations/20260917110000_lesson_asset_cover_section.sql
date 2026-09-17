-- Cover VIDEO and PDF attach to the first module with section='cover'.
-- Cover PHOTO stays on courses.cover_path. Do not rewrite the earlier
-- introduction/main/notes check; this only widens allowed section values.

alter table public.lesson_assets
  drop constraint if exists lesson_assets_section_chk;

alter table public.lesson_assets
  add constraint lesson_assets_section_chk
  check (section is null or section in ('cover', 'introduction', 'main', 'notes'));
