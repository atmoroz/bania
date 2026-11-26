-- Reordering the gallery is one statement, not one request per tile.
--
-- Dragging a photograph to the top changes the position of everything it
-- passed. Sent as separate updates that is a dozen round trips and a window
-- in which the page is half-reordered; here the new order either lands whole
-- or not at all.

create or replace function public.set_gallery_order(ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- RLS would refuse the update anyway. This turns a silent "nothing
  -- happened" into an error the panel can show.
  if not (select public.is_admin()) then
    raise exception 'Only an administrator may reorder the gallery' using errcode = '42501';
  end if;

  update public.gallery_photos g
     set sort_order = o.position
    from unnest(ids) with ordinality as o(id, position)
   where g.id = o.id;
end;
$$;

revoke execute on function public.set_gallery_order(uuid[]) from public, anon;
grant execute on function public.set_gallery_order(uuid[]) to authenticated;
