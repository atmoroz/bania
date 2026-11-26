-- Editable site content: pages split into ordered, hideable blocks, plus the
-- lists those blocks render.
--
-- The split is deliberate and is the whole design of this file:
--
--   page_blocks  carries the *chrome* -- eyebrows, headings, lead paragraphs,
--                call-to-action labels, per-block visibility, and small
--                inline item lists that exist only to be displayed.
--
--   real tables  carry anything with its own identity or referenced from
--                elsewhere: rooms, packages, add-ons, reviews, photographs.
--
-- Putting everything in jsonb was rejected because bookings.room_id must have
-- a foreign key to point at; a room cannot live inside a blob. Giving every
-- block type its own table was rejected too -- it would mean ten near-empty
-- tables and a migration every time the owner wants a new section.

-- ---------------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------------

-- References into Supabase Storage. PostgreSQL stores the reference, Storage
-- stores the bytes; deleting a row must also delete the object.
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt          text not null default '',
  width        integer,
  height       integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint media_width_positive check (width is null or width > 0),
  constraint media_height_positive check (height is null or height > 0)
);

drop trigger if exists media_touch_updated_at on public.media;
create trigger media_touch_updated_at before update on public.media
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- pages and blocks
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'block_type') then
    create type public.block_type as enum (
      'hero',           -- background, headline, two buttons, stat strip
      'feature_grid',   -- heading plus three icon/title/text columns
      'locations',      -- heading; cards come from public.rooms
      'packages',       -- heading; cards come from public.packages
      'addons',         -- heading; rows come from public.addons
      'gallery',        -- heading; tiles come from public.gallery_photos
      'reviews',        -- heading; items from public.reviews, grid or slider
      'contacts',       -- heading plus the contact cards
      'booking_cta',    -- heading plus the administrator's phone
      'rich_text'       -- escape hatch: heading plus prose
    );
  end if;
end $$;

create table if not exists public.pages (
  slug            text primary key,
  nav_label       text not null,
  title           text not null,
  seo_title       text,
  seo_description text,
  sort_order      integer not null default 0,
  is_visible      boolean not null default true,
  -- Keeps a page reachable by URL while hiding it from the menu.
  show_in_nav     boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint pages_slug_shape check (slug ~ '^[a-z0-9-]*$')
);

drop trigger if exists pages_touch_updated_at on public.pages;
create trigger pages_touch_updated_at before update on public.pages
  for each row execute function private.touch_updated_at();

create table if not exists public.page_blocks (
  id          uuid primary key default gen_random_uuid(),
  page_slug   text not null references public.pages (slug) on update cascade on delete cascade,
  block_type  public.block_type not null,
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,

  -- Shape depends on block_type and is validated with zod on the server before
  -- write. PostgreSQL can only guarantee that this is an object, not which
  -- keys it holds, so the application is the authority on the shape and the
  -- check below is a floor, not a ceiling.
  content     jsonb not null default '{}'::jsonb,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint page_blocks_content_is_object check (jsonb_typeof(content) = 'object')
);

create index if not exists page_blocks_page_sort_idx
  on public.page_blocks (page_slug, sort_order);
create index if not exists page_blocks_content_gin
  on public.page_blocks using gin (content jsonb_path_ops);

drop trigger if exists page_blocks_touch_updated_at on public.page_blocks;
create trigger page_blocks_touch_updated_at before update on public.page_blocks
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- packages
-- ---------------------------------------------------------------------------

create table if not exists public.packages (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  eyebrow        text,
  name           text not null,
  summary        text,
  -- Minor units, to keep money away from floating point.
  price_per_hour integer not null,
  minimum_hours  integer not null default 1,
  includes       text[] not null default '{}',
  cta_label      text,
  is_featured    boolean not null default false,
  is_visible     boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint packages_price_non_negative check (price_per_hour >= 0),
  constraint packages_minimum_hours_positive check (minimum_hours > 0)
);

create index if not exists packages_visible_sort_idx
  on public.packages (sort_order) where is_visible;

-- Which rooms a package occupies when it is booked.
--
-- The chan is sold alone or bundled with Banya #1, and a bundle must take both
-- rooms off the calendar. Empty here means the package is a marketing card
-- rather than a bookable bundle -- "Banya #1 or Banya #2" offers a choice, and
-- a choice is resolved by the administrator, not by the schema.
create table if not exists public.package_rooms (
  package_id uuid not null references public.packages (id) on delete cascade,
  room_id    uuid not null references public.rooms (id) on delete cascade,
  primary key (package_id, room_id)
);

create index if not exists package_rooms_room_id_idx on public.package_rooms (room_id);

-- A booking may record which package was sold. It stays nullable: the
-- administrator can enter a plain room booking with no package at all, and
-- deleting a package must not delete its history.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'package_id'
  ) then
    alter table public.bookings
      add column package_id uuid references public.packages (id) on delete set null;
    create index bookings_package_id_idx on public.bookings (package_id);
  end if;
end $$;

drop trigger if exists packages_touch_updated_at on public.packages;
create trigger packages_touch_updated_at before update on public.packages
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- add-ons
-- ---------------------------------------------------------------------------

create table if not exists public.addons (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  price       integer not null,
  unit        text not null default '',
  is_visible  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint addons_price_non_negative check (price >= 0)
);

create index if not exists addons_visible_sort_idx
  on public.addons (sort_order) where is_visible;

drop trigger if exists addons_touch_updated_at on public.addons;
create trigger addons_touch_updated_at before update on public.addons
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- gallery
-- ---------------------------------------------------------------------------

create table if not exists public.gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  media_id   uuid not null references public.media (id) on delete restrict,
  -- NULL means the photo belongs to the venue gallery rather than one room.
  room_id    uuid references public.rooms (id) on delete set null,
  title      text,
  caption    text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_photos_media_id_idx on public.gallery_photos (media_id);
create index if not exists gallery_photos_room_id_idx on public.gallery_photos (room_id);
create index if not exists gallery_photos_visible_sort_idx
  on public.gallery_photos (sort_order) where is_visible;

drop trigger if exists gallery_photos_touch_updated_at on public.gallery_photos;
create trigger gallery_photos_touch_updated_at before update on public.gallery_photos
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

-- The one public write path in the application. A submission is invisible
-- until the administrator approves it.
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  author_name text not null,
  body        text not null,
  rating      smallint not null,
  context     text,
  room_id     uuid references public.rooms (id) on delete set null,
  is_approved boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_author_present check (length(btrim(author_name)) between 1 and 120),
  constraint reviews_body_present check (length(btrim(body)) between 1 and 4000)
);

create index if not exists reviews_room_id_idx on public.reviews (room_id);
create index if not exists reviews_approved_sort_idx
  on public.reviews (sort_order) where is_approved;

drop trigger if exists reviews_touch_updated_at on public.reviews;
create trigger reviews_touch_updated_at before update on public.reviews
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------

-- Exactly one row, pinned by the primary key check. The fields are known and
-- typed, so a key/value store would only add indirection.
create table if not exists public.settings (
  id                      boolean primary key default true,

  -- identity and contact
  site_title              text not null default '',
  wordmark                text not null default '',
  phone_display           text not null default '',
  phone_e164              text not null default '',
  extra_phone_display     text,
  email                   text,
  address                 text,
  map_url                 text,
  instagram_handle        text,
  instagram_url           text,
  -- Display only. It does not drive availability.
  opening_hours_note      text not null default '',

  -- venue-level booking defaults, inherited by every room
  min_duration_minutes    integer not null default 60,
  buffer_minutes          integer not null default 0,
  slot_step_minutes       integer not null default 60,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint settings_single_row check (id),
  constraint settings_min_duration_positive check (min_duration_minutes > 0),
  constraint settings_buffer_non_negative check (buffer_minutes >= 0),
  constraint settings_slot_step_positive check (slot_step_minutes > 0)
);

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at before update on public.settings
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

alter table public.package_rooms  enable row level security;
alter table public.package_rooms  force row level security;

drop policy if exists package_rooms_public_read on public.package_rooms;
create policy package_rooms_public_read on public.package_rooms
  for select to anon, authenticated using (true);

drop policy if exists package_rooms_admin_all on public.package_rooms;
create policy package_rooms_admin_all on public.package_rooms
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

alter table public.media          enable row level security;
alter table public.pages          enable row level security;
alter table public.page_blocks    enable row level security;
alter table public.packages       enable row level security;
alter table public.addons         enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.reviews        enable row level security;
alter table public.settings       enable row level security;

alter table public.media          force row level security;
alter table public.pages          force row level security;
alter table public.page_blocks    force row level security;
alter table public.packages       force row level security;
alter table public.addons         force row level security;
alter table public.gallery_photos force row level security;
alter table public.reviews        force row level security;
alter table public.settings       force row level security;

do $$
declare
  t text;
begin
  -- Read-what-is-visible for everyone, full control for the administrator.
  -- Written as a loop because the policy text is identical for these tables
  -- apart from the visibility column, and eight copies would drift.
  foreach t in array array['media', 'settings'] loop
    execute format('drop policy if exists %I_public_read on public.%I', t, t);
    execute format(
      'create policy %I_public_read on public.%I for select to anon, authenticated using (true)', t, t);
  end loop;

  foreach t in array array['pages', 'packages', 'addons', 'gallery_photos'] loop
    execute format('drop policy if exists %I_public_read on public.%I', t, t);
    execute format(
      'create policy %I_public_read on public.%I for select to anon, authenticated using (is_visible)', t, t);
  end loop;

  foreach t in array array['media', 'pages', 'page_blocks', 'packages',
                           'addons', 'gallery_photos', 'reviews', 'settings'] loop
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated '
      'using ((select private.is_admin())) with check ((select private.is_admin()))', t, t);
  end loop;
end $$;

-- A block is readable when it is visible and its page is visible. Checking the
-- page here means hiding a page also hides everything inside it, without the
-- administrator having to remember to switch off each block.
drop policy if exists page_blocks_public_read on public.page_blocks;
create policy page_blocks_public_read on public.page_blocks
  for select to anon, authenticated
  using (
    is_visible
    and exists (
      select 1 from public.pages p
      where p.slug = page_blocks.page_slug and p.is_visible
    )
  );

-- Approved reviews only.
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (is_approved);

-- Visitors may submit a review but cannot approve their own: the insert is
-- rejected unless is_approved is false.
drop policy if exists reviews_public_insert on public.reviews;
create policy reviews_public_insert on public.reviews
  for insert to anon, authenticated
  with check (is_approved = false);
