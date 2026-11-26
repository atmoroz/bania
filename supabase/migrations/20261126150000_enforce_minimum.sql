-- Hour-long slots, with a two-hour minimum enforced where it cannot be bypassed.
--
-- The calendar now offers one-hour slots and asks for at least two. That rule
-- lived only in the interface, which means it was not a rule: place_hold never
-- checked duration, so a crafted API call could take a single hour.
--
-- It is checked per contiguous run, not per request. Picking 10:00 and 14:00 is
-- two selections but two separate one-hour bookings, and neither reaches the
-- minimum.

begin;

update public.settings
   set slot_step_minutes = 60,
       min_duration_minutes = 120;

create or replace function private.insert_hold(
  p_room_id      uuid,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz,
  p_hold_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      uuid;
  v_buffer  integer;
  v_minimum integer;
  v_unit    uuid;
begin
  select coalesce(r.buffer_minutes, s.buffer_minutes, 0),
         coalesce(r.min_duration_minutes, s.min_duration_minutes, 60)
    into v_buffer, v_minimum
    from public.rooms r
    left join public.settings s on true
   where r.id = p_room_id;

  -- The minimum applies to this run, which is why it is checked here rather
  -- than against the number of slots the caller selected.
  if extract(epoch from (p_ends_at - p_starts_at)) / 60 < v_minimum then
    raise exception
      'booking must be at least % minutes (got %)',
      v_minimum, round(extract(epoch from (p_ends_at - p_starts_at)) / 60)
      using errcode = 'check_violation';
  end if;

  insert into public.bookings (
    starts_at, ends_at, status, buffer_minutes, offering_id, hold_expires_at
  )
  values (
    p_starts_at, p_ends_at, 'PENDING', coalesce(v_buffer, 0), p_room_id,
    now() + make_interval(mins => p_hold_minutes)
  )
  returning id into v_id;

  for v_unit in select * from public.room_units(p_room_id) loop
    insert into public.booking_rooms (booking_id, room_id) values (v_id, v_unit);
  end loop;

  return v_id;
end;
$$;

revoke execute on function private.insert_hold(uuid, timestamptz, timestamptz, integer)
  from public, anon, authenticated;

-- The calendar needs to know the rule in order to state it, so expose the
-- effective minimum for a card. Reading it is harmless; enforcing it is not
-- delegated to whoever reads it.
create or replace function public.room_minimum_minutes(p_room_slug text)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(r.min_duration_minutes, s.min_duration_minutes, 60)
  from public.rooms r
  left join public.settings s on true
  where r.slug = p_room_slug and r.is_visible;
$$;

grant execute on function public.room_minimum_minutes(text) to anon, authenticated;

commit;
