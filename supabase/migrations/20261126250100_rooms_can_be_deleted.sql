-- A card can be deleted after all — when nothing is holding it.
--
-- Decision 0017 said cards are only ever hidden, on the grounds that
-- bookings record which card was sold. That is the right instinct for a card
-- that has been sold and the wrong answer for one created by mistake two
-- minutes ago, which the panel could then never remove. The rule becomes a
-- condition instead of a prohibition, and the condition is shown in the
-- panel rather than discovered by pressing a button.
--
-- Three things hold a card:
--
--   * booking_rooms  -- the zone was occupied. Already `on delete restrict`;
--                       the check here is so the refusal has a name in it.
--   * bookings.offering_id -- the card was sold. `on delete set null`, which
--                       would quietly blank the record of what was sold.
--                       This is the one the database would NOT have caught.
--   * room_components -- another card is made of this one.
--
-- Everything else cascades harmlessly: a card's own photographs and its own
-- composition rows go with it.

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
  doomed   record;
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

  -- ---------------------------------------------------------------------
  -- Cards the payload no longer contains
  -- ---------------------------------------------------------------------

  for doomed in
    select r.id, r.name
      from public.rooms r
     where not exists (
       select 1
         from jsonb_array_elements(items) as e(value)
        where (e.value->>'id')::uuid = r.id
     )
  loop
    if exists (select 1 from public.booking_rooms br where br.room_id = doomed.id) then
      raise exception 'Картку «%» не можна видалити: вона вже зайнята бронюваннями.', doomed.name
        using errcode = 'foreign_key_violation';
    end if;

    if exists (select 1 from public.bookings b where b.offering_id = doomed.id) then
      raise exception 'Картку «%» не можна видалити: за нею вже є бронювання.', doomed.name
        using errcode = 'foreign_key_violation';
    end if;

    if exists (select 1 from public.room_components c where c.component_id = doomed.id) then
      raise exception 'Картку «%» не можна видалити: вона входить до складу іншої картки.', doomed.name
        using errcode = 'foreign_key_violation';
    end if;

    delete from public.rooms r where r.id = doomed.id;
  end loop;
end;
$$;

revoke execute on function public.save_rooms(jsonb) from public, anon;
grant execute on function public.save_rooms(jsonb) to authenticated;

-- What is holding each card, so the panel can say so before the owner tries.
create or replace function public.room_locks()
returns table (room_id uuid, bookings bigint, part_of bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id,
         (select count(*) from public.booking_rooms br where br.room_id = r.id)
           + (select count(*) from public.bookings b where b.offering_id = r.id),
         (select count(*) from public.room_components c where c.component_id = r.id)
    from public.rooms r;
$$;

revoke execute on function public.room_locks() from public, anon;
grant execute on function public.room_locks() to authenticated;
