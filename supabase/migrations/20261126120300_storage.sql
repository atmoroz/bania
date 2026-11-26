-- Storage bucket for every image the site shows.
--
-- Public read, administrator write. The bucket is public because these are
-- marketing photographs meant to be served to anyone; nothing private is ever
-- put here. Customer data lives in tables that anonymous users cannot read.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB: generous for a photograph, small enough to stop accidents
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Supabase already has RLS on storage.objects; these scope it to our bucket.
--
-- There is deliberately NO select policy. A public bucket serves its objects
-- over a public URL without consulting RLS, so a select policy would add
-- nothing except the ability to LIST the bucket -- handing anyone the full
-- inventory of files. Supabase's own dashboard flags that as over-permissive,
-- and it is right.

drop policy if exists "media_public_read" on storage.objects;

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select private.is_admin()));

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select private.is_admin()))
  with check (bucket_id = 'media' and (select private.is_admin()));

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));

-- Deleting a media row must not leave its bytes behind in the bucket.
-- Doing it in the database means it cannot be forgotten by a caller.
create or replace function private.delete_media_object()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
   where bucket_id = 'media' and name = old.storage_path;
  return old;
end;
$$;

drop trigger if exists media_delete_object on public.media;
create trigger media_delete_object
  after delete on public.media
  for each row execute function private.delete_media_object();
