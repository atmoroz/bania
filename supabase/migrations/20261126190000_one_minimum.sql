-- One definition of "how long must a session be on this card".
--
-- There were four answers. Three were the same expression copied into
-- room_schedule_for_date, room_minimum_minutes and private.insert_hold; the
-- fourth was rooms.minimum_hours, a number typed in by hand and kept in step
-- by nobody. They agreed only because the seed happened to write 2 hours
-- everywhere and the venue default happened to be 120 minutes. Raising the
-- venue minimum to three hours would have left every card advertising two
-- while the database refused anything under three.
--
-- public.minimum_minutes(rooms) is now the only place the rule is written.
-- It takes the row, so PostgREST exposes it as a computed column and the
-- card query can select it like any other field — the display and the
-- enforcement read the same expression rather than two that resemble
-- each other.

create or replace function public.minimum_minutes(r public.rooms)
returns integer
language sql
stable
set search_path = ''
as $fn$
  select coalesce(
    r.min_duration_minutes,
    (select s.min_duration_minutes from public.settings s limit 1),
    60
  );
$fn$;

grant execute on function public.minimum_minutes(public.rooms) to anon, authenticated;

-- Every caller now defers to it. -------------------------------------------

create or replace function public.room_minimum_minutes(p_room_slug text)
returns integer
language sql
stable
set search_path = ''
as $fn$
  select public.minimum_minutes(r)
  from public.rooms r
  where r.slug = p_room_slug and r.is_visible;
$fn$;

grant execute on function public.room_minimum_minutes(text) to anon, authenticated;

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
  v_room    public.rooms%rowtype;
  v_buffer  integer;
  v_minimum integer;
  v_unit    uuid;
  v_admin   boolean := private.is_admin();
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

-- The card query needs the same number. PostgREST would expose
-- minimum_minutes(rooms) as a computed column, but Supabase's type generator
-- models it as a function rather than a column, so selecting it leaves the
-- query untyped and would need a cast to paper over. This returns the whole
-- set in one call instead: typed by the generator, one round trip, and still
-- the single definition — it calls minimum_minutes like everything else.
create or replace function public.room_minimums()
returns table (slug text, minimum_minutes integer)
language sql
stable
set search_path = ''
as $fn$
  select r.slug, public.minimum_minutes(r)
  from public.rooms r
  where r.is_visible;
$fn$;

grant execute on function public.room_minimums() to anon, authenticated;

-- room_schedule_for_date reported its own copy of the same number, which the
-- range version and the calendar both read. Same expression, same source.
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
as $fn$
declare
  v_tz       constant text := 'Europe/Kyiv';
  v_weekday  smallint;
  v_hours    public.opening_hours%rowtype;
  v_room     public.rooms%rowtype;
  v_settings public.settings%rowtype;
  v_closed   boolean;
begin
  select * into v_room from public.rooms where id = p_room_id;
  if not found then
    return;
  end if;

  select * into v_settings from public.settings limit 1;

  v_weekday := extract(dow from p_date)::smallint;

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
    opens_at  := ((p_date + v_hours.opens_at) at time zone v_tz);
    closes_at := ((p_date + v_hours.closes_at) at time zone v_tz);
  else
    opens_at  := null;
    closes_at := null;
  end if;

  min_duration_minutes := public.minimum_minutes(v_room);
  buffer_minutes := coalesce(v_room.buffer_minutes, v_settings.buffer_minutes, 0);

  return next;
end;
$fn$;

revoke execute on function public.room_schedule_for_date(uuid, date) from public;
grant  execute on function public.room_schedule_for_date(uuid, date) to anon, authenticated;

-- The hand-maintained copy goes. ------------------------------------------

alter table public.rooms drop constraint if exists rooms_minimum_hours_positive;
alter table public.rooms drop column if exists minimum_hours;
