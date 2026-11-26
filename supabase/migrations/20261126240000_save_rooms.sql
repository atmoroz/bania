-- The catalogue is saved as a whole, like the gallery.
--
-- A card is not one row: it has its own fields, an ordered set of
-- photographs and, when it is a bundle, the cards it is made of. Saving
-- those as separate requests would leave a card half-edited whenever one of
-- them failed. One payload, one transaction.
--
-- Deliberately there is no delete. A card can be referenced by bookings
-- already taken, and "no longer offered" is what `is_visible` is for -- a
-- deletion would be a quiet way to lose history. Cards are added and hidden,
-- never removed, and that is a rule worth making structural rather than
-- remembering.

create or replace function public.save_rooms(items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item     jsonb;
  position integer := 0;
  room     uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'Only an administrator may edit the catalogue' using errcode = '42501';
  end if;

  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'items must be a JSON array';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    position := position + 1;

    if (item->>'id') is null then
      insert into public.rooms (
        slug, name, eyebrow, short_description, description, capacity,
        price_per_hour, highlights, cta_label, is_featured, is_visible,
        accepts_bookings, min_duration_minutes, cover_media_id, sort_order
      )
      values (
        item->>'slug',
        item->>'name',
        nullif(btrim(coalesce(item->>'eyebrow', '')), ''),
        nullif(btrim(coalesce(item->>'short_description', '')), ''),
        nullif(btrim(coalesce(item->>'description', '')), ''),
        (item->>'capacity')::integer,
        (item->>'price_per_hour')::integer,
        coalesce(
          (select array_agg(value::text) from jsonb_array_elements_text(item->'highlights') as t(value)),
          '{}'
        ),
        nullif(btrim(coalesce(item->>'cta_label', '')), ''),
        coalesce((item->>'is_featured')::boolean, false),
        coalesce((item->>'is_visible')::boolean, true),
        coalesce((item->>'accepts_bookings')::boolean, true),
        (item->>'min_duration_minutes')::integer,
        (item->>'cover_media_id')::uuid,
        position
      )
      returning id into room;
    else
      room := (item->>'id')::uuid;

      update public.rooms r
         set name                 = item->>'name',
             eyebrow              = nullif(btrim(coalesce(item->>'eyebrow', '')), ''),
             short_description    = nullif(btrim(coalesce(item->>'short_description', '')), ''),
             description          = nullif(btrim(coalesce(item->>'description', '')), ''),
             capacity             = (item->>'capacity')::integer,
             price_per_hour       = (item->>'price_per_hour')::integer,
             highlights           = coalesce(
               (select array_agg(value::text) from jsonb_array_elements_text(item->'highlights') as t(value)),
               '{}'
             ),
             cta_label            = nullif(btrim(coalesce(item->>'cta_label', '')), ''),
             is_featured          = coalesce((item->>'is_featured')::boolean, false),
             is_visible           = coalesce((item->>'is_visible')::boolean, true),
             accepts_bookings     = coalesce((item->>'accepts_bookings')::boolean, true),
             min_duration_minutes = (item->>'min_duration_minutes')::integer,
             cover_media_id       = (item->>'cover_media_id')::uuid,
             sort_order           = position
       where r.id = room;

      if not found then
        raise exception 'No such card: %', room using errcode = 'no_data_found';
      end if;
    end if;

    -- Photographs: the array is the set, in order.
    delete from public.room_photos p
     where p.room_id = room
       and not exists (
         select 1
           from jsonb_array_elements_text(item->'photos') as t(media_id)
          where t.media_id::uuid = p.media_id
       );

    insert into public.room_photos (room_id, media_id, sort_order)
    select room, t.media_id::uuid, t.ordinality
      from jsonb_array_elements_text(item->'photos') with ordinality as t(media_id, ordinality)
    on conflict (room_id, media_id) do update set sort_order = excluded.sort_order;

    -- Composition: likewise. A card made of nothing stands for itself.
    delete from public.room_components c
     where c.room_id = room
       and not exists (
         select 1
           from jsonb_array_elements_text(item->'components') as t(component_id)
          where t.component_id::uuid = c.component_id
       );

    insert into public.room_components (room_id, component_id)
    select room, t.component_id::uuid
      from jsonb_array_elements_text(item->'components') as t(component_id)
    on conflict do nothing;
  end loop;
end;
$$;

revoke execute on function public.save_rooms(jsonb) from public, anon;
grant execute on function public.save_rooms(jsonb) to authenticated;
