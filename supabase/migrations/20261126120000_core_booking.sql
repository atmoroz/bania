-- Core booking schema: rooms, their opening hours and closures, and bookings.
--
-- Decisions this encodes (see docs/decisions/):
--   0001  bookings are entered by the administrator after a phone call
--   0002  minimum session 1 hour, maximum until closing
--   0003  one fixed timezone, Europe/Kyiv, by IANA name
--   0004  two booking statuses only
--   0005  buffer is an admin setting, snapshotted onto each booking row
--   0006  rooms are independent; non-overlap is scoped per room
--   0007  per-weekday hours with dated closures

create extension if not exists btree_gist;

-- Private schema for helpers that must never be callable from the client.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    -- No PENDING: a booking only ever enters through the administrator,
    -- so it is already agreed by the time it is written down.
    create type public.booking_status as enum ('CONFIRMED', 'CANCELLED');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- shared trigger: keep updated_at honest
-- ---------------------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin check
-- ---------------------------------------------------------------------------

-- One administrator, so "is an admin" means "is signed in". Kept as a function
-- rather than inlined so that adding a real role later touches one place
-- instead of every policy.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null;
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------

create table if not exists public.rooms (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null,
  short_description    text,
  description          text,
  capacity             integer,
  price_per_hour       integer,
  sort_order           integer not null default 0,

  -- Two switches on purpose: "advertised but closed for renovation" and
  -- "removed from the site" are different situations.
  is_visible           boolean not null default true,
  accepts_bookings     boolean not null default true,

  -- NULL means "inherit the venue default". The nullability is load-bearing:
  -- it keeps "not set" distinct from "set to the same number as the venue",
  -- which is what lets a change to the venue default move the inheriting
  -- rooms and leave the overridden ones alone.
  min_duration_minutes integer,
  buffer_minutes       integer,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint rooms_capacity_positive check (capacity is null or capacity > 0),
  constraint rooms_price_non_negative check (price_per_hour is null or price_per_hour >= 0),
  constraint rooms_min_duration_positive check (min_duration_minutes is null or min_duration_minutes > 0),
  constraint rooms_buffer_non_negative check (buffer_minutes is null or buffer_minutes >= 0)
);

create index if not exists rooms_visible_sort_idx
  on public.rooms (sort_order) where is_visible;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at before update on public.rooms
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- opening hours
-- ---------------------------------------------------------------------------

-- Times are local time-of-day in Europe/Kyiv, combined with a date at query
-- time. They are not timestamps: "opens at 10:00" is a wall-clock fact that
-- must survive a DST transition unchanged.
create table if not exists public.opening_hours (
  id         uuid primary key default gen_random_uuid(),
  -- NULL room_id is the venue default that rooms inherit.
  room_id    uuid references public.rooms (id) on delete cascade,
  weekday    smallint not null,
  opens_at   time,
  closes_at  time,
  is_closed  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint opening_hours_weekday_range check (weekday between 0 and 6),

  -- An open day needs both times, and overnight hours are deliberately
  -- unsupported in v1 -- see open question G. Enforcing it here makes the
  -- limitation explicit instead of silently producing an empty day.
  constraint opening_hours_times_coherent check (
    is_closed or (opens_at is not null and closes_at is not null and closes_at > opens_at)
  )
);

-- One rule per weekday per scope. Two partial unique indexes because NULL is
-- not comparable in a plain unique constraint, so the venue rows would escape it.
create unique index if not exists opening_hours_room_weekday_key
  on public.opening_hours (room_id, weekday) where room_id is not null;
create unique index if not exists opening_hours_venue_weekday_key
  on public.opening_hours (weekday) where room_id is null;

drop trigger if exists opening_hours_touch_updated_at on public.opening_hours;
create trigger opening_hours_touch_updated_at before update on public.opening_hours
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- closures
-- ---------------------------------------------------------------------------

-- A holiday is an event, not a weekly rule, so dated closures live apart from
-- opening_hours. Folding them together would mean editing Monday's hours to
-- close one particular Monday and remembering to change them back.
create table if not exists public.closures (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references public.rooms (id) on delete cascade,
  starts_on  date not null,
  ends_on    date not null,
  reason     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint closures_range_ordered check (ends_on >= starts_on)
);

create index if not exists closures_room_id_idx on public.closures (room_id);
create index if not exists closures_dates_idx on public.closures (starts_on, ends_on);

drop trigger if exists closures_touch_updated_at on public.closures;
create trigger closures_touch_updated_at before update on public.closures
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------

create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms (id) on delete restrict,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  customer_name  text not null,
  customer_phone text not null,
  status         public.booking_status not null default 'CONFIRMED',

  -- Snapshot of the buffer setting at write time. An exclusion constraint
  -- cannot read another table, and a per-row snapshot also stops a later
  -- settings change from retroactively invalidating existing bookings.
  buffer_minutes integer not null default 0,

  -- The session plus its own trailing buffer, maintained by a trigger.
  --
  -- This exists because the exclusion constraint below needs an IMMUTABLE
  -- expression, and `ends_at + make_interval(...)` is only STABLE: adding an
  -- interval to a timestamptz depends on the session time zone, so PostgreSQL
  -- refuses it in an index. Storing the resolved range turns the constraint
  -- into plain column references, which are immutable by definition.
  occupied       tstzrange not null,

  -- Free text, e.g. "caller is still deciding". Deliberately has no effect on
  -- availability: this is what replaces the removed PENDING status.
  note           text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint bookings_ends_after_starts check (ends_at > starts_at),
  constraint bookings_buffer_non_negative check (buffer_minutes >= 0),
  constraint bookings_customer_name_present check (length(btrim(customer_name)) > 0),
  constraint bookings_customer_phone_present check (length(btrim(customer_phone)) > 0)
);

-- Keep `occupied` in step with the columns it is derived from. Doing it in a
-- trigger rather than asking callers to compute it means the rule "a booking
-- occupies its session plus its own trailing buffer" is stated exactly once.
create or replace function private.set_booking_occupied()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The bookings_ends_after_starts check says the same thing, but a BEFORE
  -- trigger runs first, so without this guard the caller would see
  -- "range lower bound must be less than or equal to range upper bound"
  -- instead of something they can act on.
  if new.ends_at <= new.starts_at then
    raise exception 'booking must end after it starts (got % to %)',
      new.starts_at, new.ends_at
      using errcode = 'check_violation';
  end if;

  new.occupied := tstzrange(
    new.starts_at,
    new.ends_at + make_interval(mins => new.buffer_minutes),
    '[)'
  );
  return new;
end;
$$;

drop trigger if exists bookings_set_occupied on public.bookings;
create trigger bookings_set_occupied
  before insert or update of starts_at, ends_at, buffer_minutes
  on public.bookings
  for each row execute function private.set_booking_occupied();

-- No two active bookings may overlap WITHIN THE SAME ROOM.
--
-- `room_id with =` is not optional: without it a booking in one room would
-- block that time in every room. It is also why btree_gist is required --
-- GiST handles && on a range natively but not = on a uuid.
--
-- Each booking pads only its tail. That is symmetric and sufficient: the gap
-- before a booking is protected by the trailing pad of whatever precedes it.
-- The '[)' bounds let a session start exactly when the previous buffer ends.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_no_overlap'
  ) then
    alter table public.bookings add constraint bookings_no_overlap
      exclude using gist (
        room_id with =,
        occupied with &&
      ) where (status <> 'CANCELLED');
  end if;
end $$;

create index if not exists bookings_room_starts_idx
  on public.bookings (room_id, starts_at);
create index if not exists bookings_active_starts_idx
  on public.bookings (starts_at) where status <> 'CANCELLED';

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at before update on public.bookings
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.rooms          enable row level security;
alter table public.opening_hours  enable row level security;
alter table public.closures       enable row level security;
alter table public.bookings       enable row level security;

alter table public.rooms          force row level security;
alter table public.opening_hours  force row level security;
alter table public.closures       force row level security;
alter table public.bookings       force row level security;

-- Visitors may read a room only while it is visible. A hidden room must not be
-- enumerable: "hidden" has to mean hidden at the policy level, not merely
-- absent from the interface.
drop policy if exists rooms_public_read on public.rooms;
create policy rooms_public_read on public.rooms
  for select to anon, authenticated
  using (is_visible);

drop policy if exists rooms_admin_all on public.rooms;
create policy rooms_admin_all on public.rooms
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists opening_hours_public_read on public.opening_hours;
create policy opening_hours_public_read on public.opening_hours
  for select to anon, authenticated using (true);

drop policy if exists opening_hours_admin_all on public.opening_hours;
create policy opening_hours_admin_all on public.opening_hours
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists closures_public_read on public.closures;
create policy closures_public_read on public.closures
  for select to anon, authenticated using (true);

drop policy if exists closures_admin_all on public.closures;
create policy closures_admin_all on public.closures
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- bookings: NO anonymous policy at all.
--
-- This is the single most important line in the schema. Customer names and
-- phone numbers live here. Free/busy reaches the public calendar through a
-- separate view that returns a room reference and time ranges and nothing
-- else, so a public query is structurally incapable of returning a name.
drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all on public.bookings
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
