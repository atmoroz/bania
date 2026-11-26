-- Table-level privileges for the API roles.
--
-- This file exists because of a mistake worth remembering: the first version
-- of the schema defined RLS policies and stopped there, and every anonymous
-- request came back "permission denied for table rooms".
--
-- RLS only ever NARROWS what a role may see. It does not grant anything. A
-- role still needs an ordinary GRANT before a policy gets a chance to filter
-- its rows. Policies without grants deny everything; grants without policies
-- expose everything. Both are needed, and they do different jobs.

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- read
-- ---------------------------------------------------------------------------

-- Public-facing content. The policies already narrow these to what is visible
-- or approved, so the grant is safe at table level.
grant select on
  public.rooms,
  public.opening_hours,
  public.closures,
  public.media,
  public.pages,
  public.page_blocks,
  public.packages,
  public.package_rooms,
  public.addons,
  public.gallery_photos,
  public.reviews,
  public.settings
to anon, authenticated;

grant select on public.busy_intervals to anon, authenticated;

-- ---------------------------------------------------------------------------
-- write
-- ---------------------------------------------------------------------------

-- The one public write path. The policy forces is_approved = false, so a
-- visitor can submit a review but cannot publish it.
grant insert on public.reviews to anon, authenticated;

-- Administrator operations. Every one of these tables carries an
-- "admin_all" policy checking private.is_admin(), so being signed in is not
-- by itself enough to pass -- the grant only lets the policy be evaluated.
grant insert, update, delete on
  public.rooms,
  public.opening_hours,
  public.closures,
  public.media,
  public.pages,
  public.page_blocks,
  public.packages,
  public.package_rooms,
  public.addons,
  public.gallery_photos,
  public.reviews,
  public.settings
to authenticated;

-- ---------------------------------------------------------------------------
-- bookings stay out of reach
-- ---------------------------------------------------------------------------

-- Deliberately NO grant to anon on bookings or booking_rooms. Customer names
-- and phone numbers live there. Free/busy reaches the public calendar through
-- busy_intervals, which exposes a room reference and an interval and nothing
-- else, so an anonymous query is structurally unable to return personal data.
grant select, insert, update, delete on
  public.bookings,
  public.booking_rooms
to authenticated;

revoke all on public.bookings     from anon;
revoke all on public.booking_rooms from anon;

-- Future tables in this schema should get the same treatment automatically,
-- so a later migration cannot reintroduce the bug this file fixes.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
