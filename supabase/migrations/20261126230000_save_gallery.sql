-- The gallery is saved as a whole, in one statement.
--
-- The first version of the editor wrote on every action: a request per
-- caption, per hidden tile, per drag. That is both a lot of traffic and two
-- different rules in one panel -- the page editor saves on a button and the
-- gallery saved as you went. One button, one request, one transaction.
--
-- The payload is the gallery as it should end up: an ordered array of
-- {id, media_id, title, caption, is_visible}. A row with no id is new; a row
-- that is no longer in the array is gone. Position in the array is the order.

create or replace function public.save_gallery(items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- RLS would refuse the writes anyway. This turns a silent "nothing
  -- happened" into an error the panel can show.
  if not (select public.is_admin()) then
    raise exception 'Only an administrator may edit the gallery' using errcode = '42501';
  end if;

  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'items must be a JSON array';
  end if;

  with wanted as (
    select (e.value->>'id')::uuid                                   as id,
           (e.value->>'media_id')::uuid                             as media_id,
           nullif(btrim(coalesce(e.value->>'title', '')), '')       as title,
           nullif(btrim(coalesce(e.value->>'caption', '')), '')     as caption,
           coalesce((e.value->>'is_visible')::boolean, true)        as is_visible,
           e.ordinality::integer                                    as position
      from jsonb_array_elements(items) with ordinality as e(value, ordinality)
  ),
  -- Gone from the array means gone from the gallery. Only the venue gallery
  -- is touched: a row carrying a room belongs to that card.
  removed as (
    delete from public.gallery_photos g
     where g.room_id is null
       and not exists (
         select 1 from wanted w where w.id = g.id
       )
    returning g.id
  ),
  changed as (
    update public.gallery_photos g
       set title      = w.title,
           caption    = w.caption,
           is_visible = w.is_visible,
           sort_order = w.position
      from wanted w
     where g.id = w.id
    returning g.id
  )
  insert into public.gallery_photos (media_id, room_id, title, caption, is_visible, sort_order)
  select w.media_id, null, w.title, w.caption, w.is_visible, w.position
    from wanted w
   where w.id is null;
end;
$$;

revoke execute on function public.save_gallery(jsonb) from public, anon;
grant execute on function public.save_gallery(jsonb) to authenticated;
