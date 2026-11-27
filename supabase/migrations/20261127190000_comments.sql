-- What each table and function is for, written where a person looks.
--
-- The reasoning lives in docs/ and in the migrations, but neither is
-- open when somebody is staring at the table editor in Supabase at
-- eleven at night. These are one-liners: what the thing holds, and the
-- one rule about it that is easy to get wrong.

-- tables -------------------------------------------------------------

comment on table public.rooms is
  'The catalogue: zones and the sets made of them. A set occupies every zone it sells (see room_components), which is why a booking expands through room_units. price_per_hour is in kopiyky.';
comment on column public.rooms.price_per_hour is 'Kopiyky, not hryvnia: money never touches a float.';
comment on column public.rooms.min_duration_minutes is 'This card''s own minimum; null means the venue default in settings. Read it through minimum_minutes(rooms), never directly.';
comment on column public.rooms.accepts_bookings is 'A card can be visible and closed for the season. The calendar must filter on this.';

comment on table public.room_components is 'Which zones a set is made of. A set must not list itself.';
comment on table public.room_photos is 'The pictures on a card, in sort_order. The cover is rooms.cover_media_id.';

comment on table public.bookings is
  'One booking or one hold. PENDING with hold_expires_at in the future is a hold a visitor placed and has not confirmed by telephone; CONFIRMED is the administrator''s word. Cancelling frees the slot through booking_rooms.is_active.';
comment on column public.bookings.hold_expires_at is 'Only for PENDING. Past it, expire_stale_holds cancels the row and busy_intervals already ignores it.';
comment on column public.bookings.buffer_minutes is 'Cleaning time after the booking. Padded into booking_rooms.occupied, so the exclusion constraint enforces it.';

comment on table public.booking_rooms is
  'The zones a booking occupies, and the only place overlap is prevented: an exclusion constraint on (room_id, occupied) where is_active. Nothing in the application may be trusted to do this.';
comment on column public.booking_rooms.occupied is 'tstzrange, booking plus its buffer. Stored rather than computed because an index expression must be immutable; kept in step by trigger.';

comment on table public.opening_hours is 'Weekly hours. room_id null is the venue default; a row with a room_id overrides it for that card.';
comment on table public.closures is 'Dated closures, inclusive. room_id null closes the whole venue.';
comment on table public.settings is 'One row, pinned by a check constraint: identity, contacts and the venue-wide booking rules.';
comment on column public.settings.hold_minutes is 'How long the calendar keeps a slot while the guest telephones. Read by place_hold; 1–120.';
comment on column public.settings.slot_step_minutes is 'The grid the calendar offers and insert_hold enforces.';

comment on table public.social_links is 'The owner''s profiles, in display order. Full URLs: the footer links them as they are.';
comment on table public.pages is 'A page of the public site. show_in_nav false keeps it reachable by URL and out of the menu — that is what /privacy uses.';
comment on table public.page_blocks is 'The bands a page is built from. content is jsonb whose shape depends on block_type and is validated with zod on the server, not here.';
comment on table public.page_block_drafts is 'Unpublished edits from the panel. The public site never reads this table.';
comment on table public.admin_previews is 'A staged catalogue or gallery, so the owner can look at unsaved work on the real page. Short-lived.';

comment on table public.media is 'Every uploaded file, one row per object in Storage. Deleting the row is not enough: the object is removed through the Storage API by the server action.';
comment on table public.gallery_photos is 'The public gallery: which pictures, in what order, with what captions.';
comment on table public.addons is 'Everything sold beside the hour. category is the owner''s own heading and groups the list on the pricing page; price is in kopiyky.';

comment on table public.reviews is
  'Guest reviews. The only public write path is submit_review, which forces is_approved = false and caps unmoderated rows — there is no insert policy for anon.';
comment on table public.rule_sections is
  'The house rules and what a booking includes, as sections of lines. kind picks which dialog shows it: rules or included. items is jsonb — a line has no identity of its own.';

-- functions ----------------------------------------------------------

comment on function public.place_hold(text, timestamptz[], integer) is
  'Places a hold for an anonymous visitor. Merges contiguous slots, expands a set into its zones, caps concurrent holds. The slot length argument is ignored: the grid comes from settings.';
comment on function public.release_hold(uuid[]) is
  'Lets a visitor drop their own hold. Possession of the ids is the proof of ownership; only live PENDING rows are touched.';
comment on function public.hold_state(uuid[]) is
  'What became of a hold: live, confirmed or gone. The visitor''s page asks this instead of trusting its own localStorage.';
comment on function public.expire_stale_holds() is
  'Cancels PENDING rows whose hold has lapsed. Called before every availability read; cheap, and the moment it matters.';
comment on function public.room_schedule_for_date(uuid, date) is
  'Opening hours for one card on one day in Europe/Kyiv, resolving card override, venue default and closures. The one authority on when the place is open.';
comment on function public.minimum_minutes(public.rooms) is
  'How long a session on this card must be: its own override, else the venue default. One expression, used by the display and by the enforcement.';
comment on function public.submit_review(smallint, text, text) is
  'The only way a visitor can write to reviews. Forces is_approved = false and refuses past 200 unmoderated — a ceiling a policy cannot express.';
comment on function public.is_admin() is
  'Whether the caller is on the private.admin_users allowlist. Not "is signed in": anonymous sign-ins carry the authenticated role too.';

comment on view public.busy_intervals is
  'Public free/busy. Room, interval, and whether it is a confirmed booking or a live hold. Never customer data — this is the only route anon has to occupancy.';
