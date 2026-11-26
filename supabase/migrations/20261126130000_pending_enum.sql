-- PENDING comes back, because now something can create it.
--
-- Decision 0004 removed it on the grounds that no actor could produce the state.
-- The public calendar now can: a visitor selects slots and places a hold that
-- lives for five minutes while they telephone the administrator.
--
-- Runs on its own: PostgreSQL will not let a new enum value be USED in the same
-- transaction that adds it, so this cannot be bundled with the migration that
-- follows.

alter type public.booking_status add value if not exists 'PENDING' before 'CONFIRMED';
