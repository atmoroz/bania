-- Availability: resolving a room's effective rules, and the only way the
-- public side ever learns which hours are taken.

-- ---------------------------------------------------------------------------
-- effective rules for a room on a date
-- ---------------------------------------------------------------------------

-- Resolution order is room override -> venue default -> closure.
-- It lives in one function rather than being spread across the application,
-- because getting it wrong in one place and right in another is the kind of
-- bug that only shows up as a double booking.
create or replace function public.room_schedule_for_date(
  p_room_id uuid,
  p_date    date
)
returns table (
  is_open              boolean,
  opens_at             timestamptz,
  closes_at            timestamptz,
  min_duration_minutes integer,
  buffer_minutes       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz           constant text := 'Europe/Kyiv';
  v_weekday      smallint;
  v_hours        public.opening_hours%rowtype;
  v_room         public.rooms%rowtype;
  v_settings     public.settings%rowtype;
  v_closed       boolean;
begin
  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    return;
  end if;

  select * into v_settings from public.settings limit 1;

  -- PostgreSQL counts Sunday as 0; so does this schema.
  v_weekday := extract(dow from p_date)::smallint;

  -- Room override for the whole week, or the venue default. Mixed inheritance
  -- per day is deliberately unsupported: a room overrides every weekday or none.
  if exists (select 1 from public.opening_hours where room_id = p_room_id) then
    select * into v_hours from public.opening_hours
      where room_id = p_room_id and weekday = v_weekday;
  else
    select * into v_hours from public.opening_hours
      where room_id is null and weekday = v_weekday;
  end if;

  select exists (
    select 1 from public.closures c
    where p_date between c.starts_on and c.ends_on
      and (c.room_id is null or c.room_id = p_room_id)
  ) into v_closed;

  is_open := v_hours.id is not null
         and not coalesce(v_hours.is_closed, true)
         and not v_closed
         and coalesce(v_room.accepts_bookings, false);

  if is_open then
    -- Build the instants from local wall-clock time in the venue zone, so a
    -- DST transition shifts them correctly instead of silently moving the day.
    opens_at  := ((p_date + v_hours.opens_at) at time zone v_tz);
    closes_at := ((p_date + v_hours.closes_at) at time zone v_tz);
  else
    opens_at  := null;
    closes_at := null;
  end if;

  min_duration_minutes := coalesce(
    v_room.min_duration_minutes, v_settings.min_duration_minutes, 60);
  buffer_minutes := coalesce(
    v_room.buffer_minutes, v_settings.buffer_minutes, 0);

  return next;
end;
$$;

revoke execute on function public.room_schedule_for_date(uuid, date) from public;
grant execute on function public.room_schedule_for_date(uuid, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- public free/busy
-- ---------------------------------------------------------------------------

-- The only route by which an anonymous visitor learns that a slot is taken.
--
-- It returns a room reference and an occupied interval. Nothing else. A room
-- reference is safe to publish; a customer's name is not. The point is that a
-- public query is *structurally* unable to return personal data, rather than
-- merely not asking for it.
--
-- security_invoker is off on purpose: the view needs to read bookings, which
-- anonymous users have no policy for. It compensates by selecting only the two
-- harmless columns and by filtering to visible rooms.
create or replace view public.busy_intervals
with (security_invoker = off)
as
  select
    b.room_id,
    b.occupied
  from public.bookings b
  join public.rooms r on r.id = b.room_id
  where b.status <> 'CANCELLED'
    and r.is_visible;

revoke all on public.busy_intervals from public;
grant select on public.busy_intervals to anon, authenticated;

comment on view public.busy_intervals is
  'Public free/busy. Room reference and occupied interval only -- never customer data.';
