-- The minimum session length is a rule for visitors, not for the owner.
--
-- Two hours is there so the public calendar cannot be filled with
-- unprofitable single hours. The owner taking a booking by telephone is
-- already deciding whether an hour is worth selling -- the whole reason the
-- calendar is free/busy only -- so the check was stopping the one person it
-- was never meant to stop.
--
-- Same shape as the past-booking guard added alongside it: the rule holds,
-- private.is_admin() is the exemption.
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
  v_admin   boolean := private.is_admin();
begin
  if p_starts_at < now() and not v_admin then
    raise exception 'booking cannot start in the past'
      using errcode = 'check_violation';
  end if;

  select coalesce(r.buffer_minutes, s.buffer_minutes, 0),
         coalesce(r.min_duration_minutes, s.min_duration_minutes, 60)
    into v_buffer, v_minimum
    from public.rooms r
    left join public.settings s on true
   where r.id = p_room_id;

  if not v_admin
     and extract(epoch from (p_ends_at - p_starts_at)) / 60 < v_minimum then
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
