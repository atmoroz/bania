# BACKLOG

Work that is deliberately deferred. Nothing here blocks the main roadmap.
Each item must state *why* it is deferred and *what* has to be true before it is picked up.

---

## 1. Telegram notifications to the owner

**Status:** deferred (decision of 2026-11-25).

**Why deferred.** Bookings are not created by the public site. The calendar only shows
free / busy; clicking a free slot shows a tooltip asking the visitor to call the
administrator. So a booking is always entered by the administrator, who already knows
about it — there is nothing to notify them about yet.

**Pick it up when** any of the following becomes true:
- the public site starts creating bookings itself (self-service booking), or
- public review submission needs to alert the owner for moderation, or
- the owner asks for a daily/weekly digest of upcoming bookings.

**Scope when implemented** (constraints already fixed in `CLAUDE.md`):
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` stay server-side only.
- Notification failure must never invalidate a booking that was written successfully.
- Must be idempotent — no duplicate messages on retried requests.
- Log failures without leaking customer personal data.

---

## 2. Realtime calendar updates

**Status:** deferred.

**Why deferred.** An improvement, not a foundation. Availability is read from
PostgreSQL on request; stale-by-a-few-seconds free/busy state is acceptable for a
phone-confirmed booking flow.

**Pick it up when** the calendar is in production and concurrent viewers are real.

**Scope when implemented.** Supabase Realtime on `bookings`; refresh availability
across connected clients. Must not expose customer personal data over the channel.

---

## 3. Self-service public booking

**Status:** out of scope (decision of 2026-11-25).

**Why.** Owner chose phone confirmation instead. The database still enforces
non-overlapping bookings via an exclusion constraint, because the administrator can
make mistakes too.

**Pick it up when** the owner wants visitors to book without calling. This re-opens:
race-condition handling, duplicate submission handling, server-side availability
revalidation, and item 1 above.

---

## 4. Prepayment / online payment

**Status:** not planned.

**Why.** No payment requirement has been stated. Confirmation happens by phone.

---

## 5. Multiple administrators / role management

**Status:** not planned.

**Why.** `CLAUDE.md` explicitly says to support one administrator and avoid building
role management until requirements change.
