-- The media library needs two things the schema did not have: a way to ask
-- where a file is used, and a way to delete one that is used.
--
-- Deleting matters because the references are `on delete restrict`: the
-- database refuses, correctly, rather than letting a photograph vanish from a
-- card nobody was looking at. The owner still has to be able to decide. So
-- the decision is made in the panel, and the detaching is done here in one
-- transaction -- never half of it.

-- ---------------------------------------------------------------------------
-- where is this file used?
-- ---------------------------------------------------------------------------

-- One row per use. Four kinds, because there are exactly four places a file
-- can be referenced from, and a new one must be added here or deleting will
-- silently leave it dangling.
create or replace function public.media_usage()
returns table (media_id uuid, kind text, label text)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.cover_media_id, 'room_cover', r.name
    from public.rooms r
   where r.cover_media_id is not null

  union all
  select rp.media_id, 'room_photo', r.name
    from public.room_photos rp
    join public.rooms r on r.id = rp.room_id

  union all
  select gp.media_id, 'gallery', coalesce(nullif(gp.title, ''), 'Фотогалерея')
    from public.gallery_photos gp

  -- Blocks reference a file by storage path inside their jsonb, so this is a
  -- join on the path rather than on an id. `backgroundMediaPath` is the only
  -- such key today; another one must be added to this union and to
  -- public.delete_media below, together.
  union all
  select m.id, 'block', coalesce(nullif(p.title, ''), b.page_slug, 'Головна')
    from public.page_blocks b
    join public.media m on m.storage_path = b.content->>'backgroundMediaPath'
    left join public.pages p on p.slug = b.page_slug;
$$;

revoke execute on function public.media_usage() from public, anon;
grant execute on function public.media_usage() to authenticated;

-- ---------------------------------------------------------------------------
-- delete, detaching whatever points at the file
-- ---------------------------------------------------------------------------

create or replace function public.delete_media(ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  paths text[];
  removed integer;
begin
  -- RLS would refuse the writes anyway. This turns a silent "nothing
  -- happened" into an error the panel can show.
  if not (select public.is_admin()) then
    raise exception 'Only an administrator may delete media' using errcode = '42501';
  end if;

  select array_agg(storage_path) into paths from public.media where id = any(ids);

  update public.rooms set cover_media_id = null where cover_media_id = any(ids);
  delete from public.room_photos   where media_id = any(ids);
  delete from public.gallery_photos where media_id = any(ids);

  update public.page_blocks
     set content = content - 'backgroundMediaPath'
   where content->>'backgroundMediaPath' = any(coalesce(paths, '{}'));

  update public.page_block_drafts
     set content = content - 'backgroundMediaPath'
   where content->>'backgroundMediaPath' = any(coalesce(paths, '{}'));

  -- The row's own trigger removes the object from the bucket, so the bytes
  -- cannot be left behind by a caller that forgot.
  delete from public.media where id = any(ids);
  get diagnostics removed = row_count;

  return removed;
end;
$$;

revoke execute on function public.delete_media(uuid[]) from public, anon;
grant execute on function public.delete_media(uuid[]) to authenticated;
