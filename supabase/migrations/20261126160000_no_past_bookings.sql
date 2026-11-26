-- A booking cannot start in the past.
--
-- Nothing checked this: the interface hid past slots, but the interface is not
-- a rule, and place_hold would happily have written a booking for this morning.
--
-- The administrator is exempt. Recording a visit after the fact is a real part
-- of running the place, and that path is already behind authentication.
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
as $fn$
declare
  v_id      uuid;
  v_buffer  integer;
  v_minimum integer;
  v_unit    uuid;
begin
  if p_starts_at < now() and not private.is_admin() then
    raise exception 'booking cannot start in the past'
      using errcode = 'check_violation';
  end if;

  select coalesce(r.buffer_minutes, s.buffer_minutes, 0),
         coalesce(r.min_duration_minutes, s.min_duration_minutes, 60)
    into v_buffer, v_minimum
    from public.rooms r
    left join public.settings s on true
   where r.id = p_room_id;

  if extract(epoch from (p_ends_at - p_starts_at)) / 60 < v_minimum then
    raise exception 'booking must be at least % minutes (got %)',
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
$fn$;

revoke execute on function private.insert_hold(uuid, timestamptz, timestamptz, integer)
  from public, anon, authenticated;
