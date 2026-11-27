-- A hold must obey the opening hours, the closures and the slot grid.
--
-- It did not. `place_hold` is granted to anon and took the slot length as
-- an argument, validated only as "> 0"; `private.insert_hold` checked two
-- things — not in the past, not shorter than the minimum — and never
-- asked `room_schedule_for_date`, which is the function that knows the
-- hours the owner edits, the per-room overrides, the closures and DST.
--
-- So one unauthenticated request could hold 02:00–05:00 on a day the
-- place is shut, or a slot of any length off the hour grid, and those
-- rows block real bookings through the exclusion constraint while being
-- invisible on the public calendar. A reviewer and a tester found this
-- independently; the tester reproduced it against this database and the
-- hold was created.
--
-- This is the third time the same lesson is written into a migration on
-- this project (see 20261126150000 and 20261126160000): a rule that lives
-- only in the interface is not a rule. The administrator stays exempt —
-- decision 0013 — because the person on the telephone is allowed to say
-- yes to an hour the website would refuse.

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
  v_tz      constant text := 'Europe/Kyiv';
  v_id      uuid;
  v_room    public.rooms%rowtype;
  v_buffer  integer;
  v_minimum integer;
  v_unit    uuid;
  v_admin   boolean := private.is_admin();
  v_date    date;
  v_sched   record;
  v_step    integer;
begin
  if p_starts_at < now() and not v_admin then
    raise exception 'booking cannot start in the past'
      using errcode = 'check_violation';
  end if;

  select * into v_room from public.rooms where id = p_room_id;

  v_minimum := public.minimum_minutes(v_room);
  v_buffer  := coalesce(
    v_room.buffer_minutes,
    (select s.buffer_minutes from public.settings s limit 1),
    0
  );

  if not v_admin
     and extract(epoch from (p_ends_at - p_starts_at)) / 60 < v_minimum then
    raise exception 'booking must be at least % minutes (got %)',
      v_minimum, round(extract(epoch from (p_ends_at - p_starts_at)) / 60)
      using errcode = 'check_violation';
  end if;

  -- The day the booking belongs to is its local day in Kyiv, which is how
  -- the schedule is written and how the calendar asks for it.
  if not v_admin then
    v_date := (p_starts_at at time zone v_tz)::date;

    select * into v_sched
      from public.room_schedule_for_date(p_room_id, v_date);

    if not coalesce(v_sched.is_open, false) then
      raise exception 'the venue is closed on %', v_date
        using errcode = 'check_violation';
    end if;

    if p_starts_at < v_sched.opens_at or p_ends_at > v_sched.closes_at then
      raise exception 'booking must fall inside % — %', v_sched.opens_at, v_sched.closes_at
        using errcode = 'check_violation';
    end if;

    -- On the grid the calendar offers, counted from opening: otherwise a
    -- caller can take 12:17–14:17 and leave two unsellable stubs.
    v_step := coalesce((select s.slot_step_minutes from public.settings s limit 1), 60);
    if v_step > 0
       and mod((extract(epoch from (p_starts_at - v_sched.opens_at)) / 60)::integer, v_step) <> 0
    then
      raise exception 'booking must start on the % minute grid', v_step
        using errcode = 'check_violation';
    end if;
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

-- And the slot length stops being the caller's to choose. The signature
-- keeps the parameter so nothing breaks, but it is ignored: a public page
-- may say how long an hour is only because the settings say so.
create or replace function public.place_hold(
  p_room_slug    text,
  p_slot_starts  timestamptz[],
  p_slot_minutes integer default 120
)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room          public.rooms%rowtype;
  v_hold_minutes  integer;
  v_max_holds     constant integer := 30;
  v_live_holds    integer;
  v_sorted        timestamptz[];
  v_run_start     timestamptz;
  v_run_end       timestamptz;
  v_slot          timestamptz;
  v_booking_id    uuid;
  v_step          integer;
begin
  if p_slot_starts is null or array_length(p_slot_starts, 1) is null then
    raise exception 'no slots selected';
  end if;
  if array_length(p_slot_starts, 1) > 12 then
    raise exception 'too many slots in one request';
  end if;

  select coalesce(s.slot_step_minutes, 60), coalesce(s.hold_minutes, 10)
    into v_step, v_hold_minutes
    from public.settings s limit 1;
  v_step := coalesce(v_step, 60);
  v_hold_minutes := coalesce(v_hold_minutes, 10);

  perform public.expire_stale_holds();

  select * into v_room from public.rooms
   where slug = p_room_slug and is_visible and accepts_bookings;
  if not found then
    raise exception 'room % is not bookable', p_room_slug;
  end if;

  -- A crude cap, but the only one available without an identity to rate-limit.
  select count(*) into v_live_holds from public.bookings where status = 'PENDING';
  if v_live_holds >= v_max_holds then
    raise exception 'too many unconfirmed holds right now, try again shortly';
  end if;

  select array_agg(s order by s) into v_sorted
    from unnest(p_slot_starts) s;

  v_run_start := null;
  foreach v_slot in array v_sorted loop
    if v_run_start is null then
      v_run_start := v_slot;
      v_run_end := v_slot + make_interval(mins => v_step);
    elsif v_slot = v_run_end then
      v_run_end := v_slot + make_interval(mins => v_step);
    else
      v_booking_id := private.insert_hold(v_room.id, v_run_start, v_run_end, v_hold_minutes);
      return next v_booking_id;
      v_run_start := v_slot;
      v_run_end := v_slot + make_interval(mins => v_step);
    end if;
  end loop;

  if v_run_start is not null then
    v_booking_id := private.insert_hold(v_room.id, v_run_start, v_run_end, v_hold_minutes);
    return next v_booking_id;
  end if;
end;
$$;

revoke execute on function public.place_hold(text, timestamptz[], integer) from public;
grant execute on function public.place_hold(text, timestamptz[], integer) to anon, authenticated;
