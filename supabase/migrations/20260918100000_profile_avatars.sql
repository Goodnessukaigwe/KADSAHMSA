-- Profile photos: profiles.avatar_path + public avatars bucket.
-- Users may only write objects under avatars/{userId}/*.

alter table public.profiles
  add column if not exists avatar_path text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket serves bytes at the public object URL. No SELECT policy so
-- callers cannot list every avatar; users may only write avatars/{userId}/*.

drop policy if exists avatars_objects_insert_own on storage.objects;
create policy avatars_objects_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists avatars_objects_update_own on storage.objects;
create policy avatars_objects_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists avatars_objects_delete_own on storage.objects;
create policy avatars_objects_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
