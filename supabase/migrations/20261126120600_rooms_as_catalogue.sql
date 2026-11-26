-- One catalogue instead of two.
--
-- The first pass modelled "rooms" (physical zones) and "packages" (priced
-- offers) as separate things. The owner's own description makes it clear they
-- are one list: card #1 is Banya #1, card #2 is Banya #1 + chan, card #3 is
-- Banya #2. A bundle is a card in the same catalogue, not a row in a price
-- list, and new cards -- a gazebo, say -- are created the same way as a banya.
--
-- So `rooms` becomes the catalogue of bookable cards, and a card may be
-- composed of other cards. That single change removes the duplicate entity
-- and, more importantly, makes the availability rule fall out for free:
-- booking the bundle occupies its parts, so booking Banya #1 alone also makes
-- the bundle unavailable, and vice versa. Nothing has to be kept in step.

-- ---------------------------------------------------------------------------
-- fields a card needs to render and to be booked
-- ---------------------------------------------------------------------------

alter table public.rooms
  add column if not exists eyebrow        text,
  add column if not exists highlights     text[] not null default '{}',
  add column if not exists minimum_hours  integer not null default 1,
  add column if not exists cta_label      text,
  add column if not exists is_featured    boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rooms_minimum_hours_positive') then
    alter table public.rooms add constraint rooms_minimum_hours_positive
      check (minimum_hours > 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- composition
-- ---------------------------------------------------------------------------

-- A composite card lists the cards it is made of. Banya #1 + chan has two
-- rows here; Banya #1 has none and stands for itself.
--
-- Only one bundle exists today, and that is the point: bundles are entered by
-- hand, not generated. Banya #2 cannot be combined with the chan, and nothing
-- in the schema should pretend otherwise.
create table if not exists public.room_components (
  room_id      uuid not null references public.rooms (id) on delete cascade,
  component_id uuid not null references public.rooms (id) on delete restrict,
  primary key (room_id, component_id),

  constraint room_components_no_self check (room_id <> component_id)
);

create index if not exists room_components_component_id_idx
  on public.room_components (component_id);

-- The physical zones a card occupies: its components, or itself when simple.
-- One definition, used by availability, by the admin form, and by anything
-- else that needs to know what a card actually takes.
create or replace function public.room_units(p_room_id uuid)
returns setof uuid
language sql
stable
set search_path = ''
as $$
  select component_id from public.room_components where room_id = p_room_id
  union all
  select p_room_id
  where not exists (select 1 from public.room_components where room_id = p_room_id);
$$;

grant execute on function public.room_units(uuid) to anon, authenticated;

-- A composite card is never occupied directly -- its parts are. Letting one
-- into booking_rooms would leave the parts bookable by somebody else.
create or replace function private.reject_composite_booking_room()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.room_components where room_id = new.room_id) then
    raise exception
      'room % is a bundle; book its components instead', new.room_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists booking_rooms_reject_composite on public.booking_rooms;
create trigger booking_rooms_reject_composite
  before insert or update of room_id on public.booking_rooms
  for each row execute function private.reject_composite_booking_room();

-- Which card was sold. The parts occupied live in booking_rooms; this records
-- what the customer actually chose, which is what an invoice or a report needs.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'offering_id'
  ) then
    alter table public.bookings
      add column offering_id uuid references public.rooms (id) on delete set null;
    create index bookings_offering_id_idx on public.bookings (offering_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- photographs for the detail view
-- ---------------------------------------------------------------------------

-- Each card gets its own ordered set of photographs, for the slider in the
-- details modal. Separate from gallery_photos, which is the venue-wide gallery.
create table if not exists public.room_photos (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  media_id   uuid not null references public.media (id) on delete restrict,
  caption    text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint room_photos_unique unique (room_id, media_id)
);

create index if not exists room_photos_room_sort_idx on public.room_photos (room_id, sort_order);
create index if not exists room_photos_media_id_idx on public.room_photos (media_id);

-- ---------------------------------------------------------------------------
-- retire the duplicate entity
-- ---------------------------------------------------------------------------

alter table public.bookings drop column if exists package_id;
drop table if exists public.package_rooms;
drop table if exists public.packages;

-- The pricing page now renders the same catalogue as the locations page.
update public.page_blocks
   set block_type = 'locations'
 where block_type = 'packages';

do $$
begin
  if exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
             where t.typname = 'block_type' and e.enumlabel = 'packages') then
    -- The label stays in the enum: removing a value needs the type rebuilt,
    -- and an unused label costs nothing.
    null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- security
-- ---------------------------------------------------------------------------

alter table public.room_components enable row level security;
alter table public.room_photos     enable row level security;
alter table public.room_components force row level security;
alter table public.room_photos     force row level security;

drop policy if exists room_components_public_read on public.room_components;
create policy room_components_public_read on public.room_components
  for select to anon, authenticated using (true);

drop policy if exists room_components_admin_all on public.room_components;
create policy room_components_admin_all on public.room_components
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists room_photos_public_read on public.room_photos;
create policy room_photos_public_read on public.room_photos
  for select to anon, authenticated using (true);

drop policy if exists room_photos_admin_all on public.room_photos;
create policy room_photos_admin_all on public.room_photos
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- RLS narrows; it does not grant. Both are needed.
grant select on public.room_components, public.room_photos to anon, authenticated;
grant insert, update, delete on public.room_components, public.room_photos to authenticated;
