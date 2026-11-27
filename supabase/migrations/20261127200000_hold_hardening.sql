-- Three findings from a day of adversarial testing, all in the hold path.
--
-- 1. `hold_state` answered "live" when *any* id of a hold was still
--    alive. A visitor who picked two separate runs gets two ids; if one
--    was cancelled, their page went on showing an unbroken countdown for
--    a hold that was half gone.
--
-- 2. The ceiling of thirty concurrent holds was read once, before the
--    first insert, so a caller already at twenty-nine could take the
--    total to thirty-five in one request — one request can hold up to
--    six separate runs.
--
-- 3. `busy_intervals` published `hold_expires_at` to anyone. No personal
--    data, but it is the exact second each hold lapses: everything a
--    script needs to snipe an hour. Nothing in the application reads it
--    from the view.

create or replace function public.hold_state(p_ids uuid[])
returns table (state text, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_live  integer;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    state := 'gone';
    expires_at := null;
    return next;
    return;
  end if;

  v_total := array_length(p_ids, 1);

  -- Confirmed wins: once the administrator has taken the call, that is
  -- the whole news. The end time comes from the confirmed rows only,
  -- not from any that were thrown away along the way.
  if exists (
    select 1 from public.bookings
     where id = any(p_ids) and status = 'CONFIRMED'
  ) then
    state := 'confirmed';
    select max(b.ends_at) into expires_at
      from public.bookings b
     where b.id = any(p_ids) and b.status = 'CONFIRMED';
    return next;
    return;
  end if;

  -- Live only when every part of the hold is: half a hold is not a hold
  -- the page can honestly count down.
  select count(*), max(b.hold_expires_at)
    into v_live, expires_at
    from public.bookings b
   where b.id = any(p_ids)
     and b.status = 'PENDING'
     and b.hold_expires_at > now();

  if v_live = v_total and v_total > 0 then
    state := 'live';
  else
    state := 'gone';
    expires_at := null;
  end if;

  return next;
end;
$$;

revoke execute on function public.hold_state(uuid[]) from public;
grant execute on function public.hold_state(uuid[]) to anon, authenticated;

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
      perform private.assert_hold_room(v_max_holds);
      v_booking_id := private.insert_hold(v_room.id, v_run_start, v_run_end, v_hold_minutes);
      return next v_booking_id;
      v_run_start := v_slot;
      v_run_end := v_slot + make_interval(mins => v_step);
    end if;
  end loop;

  if v_run_start is not null then
    perform private.assert_hold_room(v_max_holds);
    v_booking_id := private.insert_hold(v_room.id, v_run_start, v_run_end, v_hold_minutes);
    return next v_booking_id;
  end if;
end;
$$;

-- Checked before every insert rather than once per request: one request
-- can hold six separate runs, so a caller sitting just under the ceiling
-- used to step straight over it.
create or replace function private.assert_hold_room(p_max integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  select count(*) into n from public.bookings where status = 'PENDING';
  if n >= p_max then
    raise exception 'too many unconfirmed holds right now, try again shortly'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function private.assert_hold_room(integer) from public, anon, authenticated;
revoke execute on function public.place_hold(text, timestamptz[], integer) from public;
grant execute on function public.place_hold(text, timestamptz[], integer) to anon, authenticated;

-- The public view loses the expiry: the application never read it from
-- here, and it told a stranger when each hour would come free.
drop view if exists public.busy_intervals;
create view public.busy_intervals
with (security_invoker = off)
as
  select
    br.room_id,
    br.occupied,
    bk.status
  from public.booking_rooms br
  join public.bookings bk on bk.id = br.booking_id
  join public.rooms r on r.id = br.room_id
  where br.is_active
    and r.is_visible
    and (bk.status <> 'PENDING' or bk.hold_expires_at > now());

revoke all on public.busy_intervals from public;
grant select on public.busy_intervals to anon, authenticated;

comment on view public.busy_intervals is
  'Public free/busy. Room, interval, and whether it is a confirmed booking or a live hold. No customer data and no expiry — the second a hold lapses is not the public''s business.';

-- 4. And the grid check itself, which a visitor agent walked straight
--    through: a start up to 29 seconds off the hour was accepted.
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
    --
    -- In seconds, not in minutes cast to an integer: that cast rounded,
    -- so a start 29 seconds off the hour passed the check and then took
    -- three grid hours out of the day instead of two, leaving a stub at
    -- each end that nothing on the public grid could ever fill.
    v_step := coalesce((select s.slot_step_minutes from public.settings s limit 1), 60);
    if v_step > 0
       and mod(extract(epoch from (p_starts_at - v_sched.opens_at))::numeric, v_step * 60) <> 0
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
