-- Five-minute holds placed from the public calendar.
--
-- The flow: a visitor picks a card, a date, and one or more two-hour slots, then
-- presses confirm. That writes a PENDING booking which occupies the slots for five
-- minutes while they telephone the administrator. If nobody confirms it, it lapses
-- and the time is free again.

begin;

-- ---------------------------------------------------------------------------
-- a hold has no customer yet, and an expiry
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column if not exists hold_expires_at timestamptz;

-- A hold is placed before anyone has given a name, so these can no longer be
-- required at insert. They are still required to confirm, which is the point at
-- which the administrator has actually spoken to the customer.
alter table public.bookings alter column customer_name  drop not null;
alter table public.bookings alter column customer_phone drop not null;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'bookings_customer_name_present') then
    alter table public.bookings drop constraint bookings_customer_name_present;
  end if;
  if exists (select 1 from pg_constraint where conname = 'bookings_customer_phone_present') then
    alter table public.bookings drop constraint bookings_customer_phone_present;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_confirmed_has_customer') then
    alter table public.bookings add constraint bookings_confirmed_has_customer
      check (
        status <> 'CONFIRMED'
        or (length(btrim(coalesce(customer_name, ''))) > 0
            and length(btrim(coalesce(customer_phone, ''))) > 0)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_pending_has_expiry') then
    alter table public.bookings add constraint bookings_pending_has_expiry
      check (status <> 'PENDING' or hold_expires_at is not null);
  end if;
end $$;

create index if not exists bookings_pending_expiry_idx
  on public.bookings (hold_expires_at) where status = 'PENDING';

-- ---------------------------------------------------------------------------
-- expiry
-- ---------------------------------------------------------------------------

-- Lazily, not on a schedule.
--
-- The exclusion constraint cannot express "active only while now() < expires_at":
-- now() is not immutable and an index expression must be. So a lapsed hold is a
-- row that is still blocking until something cancels it, and this is that
-- something. It runs at the start of every availability read and before every new
-- hold, which is exactly when a stale one would otherwise do damage.
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.bookings
     set status = 'CANCELLED'
   where status = 'PENDING'
     and hold_expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.expire_stale_holds() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- placing a hold
-- ---------------------------------------------------------------------------

-- The only way an anonymous visitor writes to bookings. A SECURITY DEFINER
-- function rather than a table grant, so the shape of what they may write is
-- fixed here instead of being whatever the client sends.
--
-- Contiguous slots are merged into one booking; a gap starts a new one. Selecting
-- 14:00 and 16:00 gives a single four-hour hold, while 14:00 and 18:00 gives two,
-- because one booking spanning the gap would block 16:00–18:00 for nobody's benefit.
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
  v_hold_minutes  constant integer := 5;
  v_max_holds     constant integer := 30;
  v_live_holds    integer;
  v_sorted        timestamptz[];
  v_run_start     timestamptz;
  v_run_end       timestamptz;
  v_slot          timestamptz;
  v_booking_id    uuid;
begin
  if p_slot_minutes <= 0 then
    raise exception 'slot length must be positive';
  end if;
  if p_slot_starts is null or array_length(p_slot_starts, 1) is null then
    raise exception 'no slots selected';
  end if;
  if array_length(p_slot_starts, 1) > 12 then
    raise exception 'too many slots in one request';
  end if;

  perform public.expire_stale_holds();

  select * into v_room from public.rooms
   where slug = p_room_slug and is_visible and accepts_bookings;
  if not found then
    raise exception 'room % is not bookable', p_room_slug;
  end if;

  -- A crude cap, but the only one available without an identity to rate-limit.
  -- Holds are anonymous, so nothing stops somebody placing them repeatedly; five
  -- minutes and this ceiling keep the damage bounded rather than prevent it.
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
      v_run_end := v_slot + make_interval(mins => p_slot_minutes);
    elsif v_slot = v_run_end then
      v_run_end := v_slot + make_interval(mins => p_slot_minutes);
    else
      v_booking_id := private.insert_hold(v_room.id, v_run_start, v_run_end, v_hold_minutes);
      return next v_booking_id;
      v_run_start := v_slot;
      v_run_end := v_slot + make_interval(mins => p_slot_minutes);
    end if;
  end loop;

  if v_run_start is not null then
    v_booking_id := private.insert_hold(v_room.id, v_run_start, v_run_end, v_hold_minutes);
    return next v_booking_id;
  end if;
end;
$$;

-- Writes one hold and the zones it occupies. Separate so place_hold reads as the
-- merging logic it is, and so the expansion of a bundle into its parts lives in
-- exactly one place.
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
  v_id     uuid;
  v_buffer integer;
  v_unit   uuid;
begin
  select coalesce(r.buffer_minutes, s.buffer_minutes, 0)
    into v_buffer
    from public.rooms r
    left join public.settings s on true
   where r.id = p_room_id;

  insert into public.bookings (
    starts_at, ends_at, status, buffer_minutes, offering_id, hold_expires_at
  )
  values (
    p_starts_at, p_ends_at, 'PENDING', coalesce(v_buffer, 0), p_room_id,
    now() + make_interval(mins => p_hold_minutes)
  )
  returning id into v_id;

  -- A bundle occupies its parts, never itself.
  for v_unit in select * from public.room_units(p_room_id) loop
    insert into public.booking_rooms (booking_id, room_id) values (v_id, v_unit);
  end loop;

  return v_id;
end;
$$;

revoke execute on function private.insert_hold(uuid, timestamptz, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.place_hold(text, timestamptz[], integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- availability
-- ---------------------------------------------------------------------------

-- busy_intervals must not report a lapsed hold as busy. The view cannot call the
-- expiry function, so it filters them out itself and the write path does the
-- actual cancelling.
create or replace view public.busy_intervals
with (security_invoker = off)
as
  select
    br.room_id,
    br.occupied,
    bk.status,
    bk.hold_expires_at
  from public.booking_rooms br
  join public.bookings bk on bk.id = br.booking_id
  join public.rooms r on r.id = br.room_id
  where br.is_active
    and r.is_visible
    and (bk.status <> 'PENDING' or bk.hold_expires_at > now());

revoke all on public.busy_intervals from public;
grant select on public.busy_intervals to anon, authenticated;

comment on view public.busy_intervals is
  'Public free/busy. Room, interval, and whether it is a confirmed booking or a live hold. Never customer data.';

commit;
