-- Apply in Supabase SQL Editor after Phase 5.
-- https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
-- Same SQL as supabase/migrations/20260908180000_lesson_assets.sql
--
-- Phase 6 pivot: private course-media bucket + lesson_assets.
-- Staff attach PDF/PPTX, video (file or YouTube/Vimeo), image, and audio
-- to existing course_lessons. Bytes are served via signed URLs after a
-- server check (requireUser + enrolment, or staff). DPTC slide authoring
-- is deferred — do not invent Module 2–12 quiz banks here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-media',
  'course-media',
  false,
  83886080,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.lesson_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons (id) on delete cascade,
  position integer not null check (position > 0),
  kind text not null check (
    kind in ('pdf', 'pptx', 'video', 'youtube', 'vimeo', 'image', 'audio')
  ),
  title text not null default '',
  storage_path text,
  external_url text,
  created_at timestamptz not null default now(),
  constraint lesson_assets_source_chk check (
    (
      kind in ('youtube', 'vimeo')
      and external_url is not null
      and char_length(trim(external_url)) > 0
    )
    or (
      kind in ('pdf', 'pptx', 'video', 'image', 'audio')
      and storage_path is not null
      and char_length(trim(storage_path)) > 0
    )
  )
);

create index if not exists lesson_assets_lesson_id_idx
  on public.lesson_assets (lesson_id, position);

alter table public.lesson_assets enable row level security;

drop policy if exists lesson_assets_select_enrolled_or_staff on public.lesson_assets;
create policy lesson_assets_select_enrolled_or_staff
  on public.lesson_assets for select
  to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.course_lessons l
      join public.enrolments e on e.course_id = l.course_id
      where l.id = lesson_assets.lesson_id
        and e.user_id = auth.uid()
    )
  );

drop policy if exists lesson_assets_write_staff on public.lesson_assets;
create policy lesson_assets_write_staff
  on public.lesson_assets for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on table public.lesson_assets from anon, authenticated;
grant select on table public.lesson_assets to authenticated;
grant insert, update, delete on table public.lesson_assets to authenticated;

-- Metadata only for enrolled/staff. Object bytes stay private: no learner
-- storage policies. Staff uploads go through the service-role server client.
drop policy if exists course_media_objects_select_staff on storage.objects;
create policy course_media_objects_select_staff
  on storage.objects for select
  to authenticated
  using (bucket_id = 'course-media' and public.is_staff());
