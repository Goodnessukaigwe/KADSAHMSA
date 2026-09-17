-- Course → named modules → lessons. Existing course_lessons rows become
-- modules; Introduction / Main / Additional Notes with text or files become
-- child lessons. Cover video/PDF stay section='cover' on the first child.
-- Apply in Supabase SQL Editor. Do not rewrite earlier migrations.

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position integer not null check (position > 0),
  slug text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

create index if not exists course_modules_course_id_idx
  on public.course_modules (course_id, position);

drop trigger if exists course_modules_set_updated_at on public.course_modules;
create trigger course_modules_set_updated_at
  before update on public.course_modules
  for each row execute procedure public.set_updated_at();

alter table public.course_lessons
  add column if not exists module_id uuid references public.course_modules (id) on delete cascade;

create index if not exists course_lessons_module_id_idx
  on public.course_lessons (module_id, position);

alter table public.course_lessons
  drop constraint if exists course_lessons_module_slug_key;

alter table public.course_lessons
  add constraint course_lessons_module_slug_key unique (module_id, slug);

alter table public.course_modules enable row level security;

drop policy if exists course_modules_select_published_or_staff on public.course_modules;
create policy course_modules_select_published_or_staff
  on public.course_modules for select
  to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.courses c
      where c.id = course_modules.course_id
        and c.status = 'published'
    )
  );

drop policy if exists course_modules_write_staff on public.course_modules;
create policy course_modules_write_staff
  on public.course_modules for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on table public.course_modules to anon, authenticated;
grant insert, update, delete on table public.course_modules to authenticated;

create or replace function public._lesson_section_has_text(value text)
returns boolean
language sql
immutable
as $$
  select length(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(value, ''), '<[^>]+>', ' ', 'g'),
          '&nbsp;', ' ', 'gi'
        ),
        '\s+', ' ', 'g'
      )
    )
  ) > 0
$$;

create or replace function public._next_course_lesson_slug(
  p_course_id uuid,
  p_wanted text
)
returns text
language plpgsql
as $$
declare
  root text := nullif(trim(p_wanted), '');
  candidate text;
  n integer := 0;
begin
  if root is null then
    root := 'lesson';
  end if;
  candidate := root;
  loop
    exit when not exists (
      select 1
      from public.course_lessons
      where course_id = p_course_id
        and slug = candidate
    );
    n := n + 1;
    candidate := root || '-' || (n + 1)::text;
    if n > 80 then
      candidate := root || '-' || replace(gen_random_uuid()::text, '-', '');
      exit;
    end if;
  end loop;
  return candidate;
end;
$$;

do $$
declare
  rec record;
  new_module_id uuid;
  sections text[];
  section_name text;
  section_body text;
  section_title text;
  child_id uuid;
  child_slug text;
  child_pos integer;
  has_intro boolean;
  has_main boolean;
  has_notes boolean;
begin
  for rec in
    select *
    from public.course_lessons
    where module_id is null
    order by course_id, position, created_at
  loop
    insert into public.course_modules (course_id, position, title, slug)
    values (rec.course_id, rec.position, rec.title, rec.slug)
    on conflict (course_id, slug) do update
      set title = excluded.title,
          position = excluded.position
    returning id into new_module_id;

    select exists (
      select 1
      from public.lesson_assets a
      where a.lesson_id = rec.id
        and a.section = 'introduction'
    ) into has_intro;
    has_intro := has_intro or public._lesson_section_has_text(rec.introduction);

    select exists (
      select 1
      from public.lesson_assets a
      where a.lesson_id = rec.id
        and a.section = 'main'
    ) into has_main;
    has_main := has_main or public._lesson_section_has_text(rec.main);

    select exists (
      select 1
      from public.lesson_assets a
      where a.lesson_id = rec.id
        and a.section = 'notes'
    ) into has_notes;
    has_notes := has_notes or public._lesson_section_has_text(rec.notes);

    sections := array[]::text[];
    if has_intro then
      sections := sections || 'introduction';
    end if;
    if has_main then
      sections := sections || 'main';
    end if;
    if has_notes then
      sections := sections || 'notes';
    end if;
    if coalesce(array_length(sections, 1), 0) = 0 then
      sections := array['main'];
    end if;

    -- Move later sections onto new lessons first so remapping the first
    -- section to 'main' cannot steal those files.
    child_pos := 1;
    for i in 2..coalesce(array_length(sections, 1), 1)
    loop
      section_name := sections[i];
      child_pos := i;
      section_body := case section_name
        when 'introduction' then rec.introduction
        when 'notes' then rec.notes
        else rec.main
      end;
      section_title := case section_name
        when 'introduction' then 'Introduction'
        when 'notes' then 'Additional Notes'
        else 'Main Content'
      end;
      child_slug := public._next_course_lesson_slug(
        rec.course_id,
        rec.slug || '-' || section_name
      );
      insert into public.course_lessons (
        course_id,
        module_id,
        position,
        slug,
        title,
        status,
        duration_label,
        introduction,
        main,
        notes
      )
      values (
        rec.course_id,
        new_module_id,
        child_pos,
        child_slug,
        section_title,
        rec.status,
        '',
        '',
        section_body,
        ''
      )
      returning id into child_id;

      update public.lesson_assets
      set
        lesson_id = child_id,
        section = 'main'
      where lesson_id = rec.id
        and section = section_name;
    end loop;

    section_name := sections[1];
    section_body := case section_name
      when 'introduction' then rec.introduction
      when 'notes' then rec.notes
      else rec.main
    end;
    section_title := case section_name
      when 'introduction' then 'Introduction'
      when 'notes' then 'Additional Notes'
      else 'Main Content'
    end;

    update public.course_lessons
    set
      module_id = new_module_id,
      position = 1,
      title = section_title,
      introduction = '',
      main = section_body,
      notes = ''
    where id = rec.id;

    update public.lesson_assets
    set section = 'main'
    where lesson_id = rec.id
      and section = section_name;
  end loop;
end;
$$;

drop function if exists public._next_course_lesson_slug(uuid, text);
drop function if exists public._lesson_section_has_text(text);

delete from public.course_lessons
where module_id is null;

alter table public.course_lessons
  alter column module_id set not null;
