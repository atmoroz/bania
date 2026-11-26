/** Pure slot arithmetic, kept apart from data access so it can be reasoned about. */

export const VENUE_TIME_ZONE = "Europe/Kyiv";

export type Slot = {
  /** ISO instant the slot begins. */
  startsAt: string;
  endsAt: string;
  /** "14:00 — 16:00", in venue local time. */
  label: string;
  state: "free" | "busy" | "held" | "past";
};

export type BusyInterval = {
  /** Half-open [start, end). */
  start: number;
  end: number;
  status: string;
};

const timeFormatter = new Intl.DateTimeFormat("uk-UA", {
  timeZone: VENUE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Always the venue's clock, never the visitor's. */
export function formatVenueTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatVenueDate(iso: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: VENUE_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Cut the open hours into fixed slots.
 *
 * A slot that would run past closing is dropped rather than shortened: the owner
 * sells whole sessions, and a 40-minute stub at the end of the day is not one.
 */
export function buildSlots({
  opensAt,
  closesAt,
  slotMinutes,
  busy,
  now,
}: {
  opensAt: string;
  closesAt: string;
  slotMinutes: number;
  busy: BusyInterval[];
  now: number;
}): Slot[] {
  const open = new Date(opensAt).getTime();
  const close = new Date(closesAt).getTime();
  const step = slotMinutes * 60_000;
  const slots: Slot[] = [];

  for (let start = open; start + step <= close; start += step) {
    const end = start + step;

    // Half-open overlap: touching intervals do not collide, so a slot may begin
    // exactly when the previous booking's buffer ends.
    const clash = busy.find((b) => start < b.end && b.start < end);

    // Past the moment it STARTS, not the moment it ends. At 15:39 the
    // 15:00-16:00 session is already under way; offering it would sell
    // somebody forty minutes of a session they think is two hours.
    const state: Slot["state"] =
      start <= now ? "past" : clash ? (clash.status === "PENDING" ? "held" : "busy") : "free";

    slots.push({
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      label: `${formatVenueTime(new Date(start).toISOString())} — ${formatVenueTime(new Date(end).toISOString())}`,
      state,
    });
  }

  return slots;
}

/**
 * Postgres timestamp text into an instant.
 *
 * PostgREST writes the zone as `+00`, which is not valid ISO 8601 — `new Date`
 * returns Invalid Date for it. That cost a real bug: every occupied interval was
 * silently dropped, so taken slots rendered as free. The database still refused
 * the booking, but the visitor would have been told "no" by a constraint instead
 * of seeing the truth on the page.
 */
function toInstant(raw: string): number {
  const iso = raw
    .trim()
    .replace(" ", "T")
    // +00 -> +00:00, -0530 -> -05:30
    .replace(/([+-])(\d{2})$/, "$1$2:00")
    .replace(/([+-])(\d{2})(\d{2})$/, "$1$2:$3");
  return new Date(iso).getTime();
}

/** Postgres `tstzrange` text, e.g. ["2026-12-20 12:00:00+00","2026-12-20 16:00:00+00"). */
export function parseRange(range: string): { start: number; end: number } | null {
  const match = range.match(/^[[(]"?([^",]+)"?,"?([^",)]+)"?[)\]]$/);
  if (!match?.[1] || !match[2]) return null;
  const start = toInstant(match[1]);
  const end = toInstant(match[2]);
  return Number.isNaN(start) || Number.isNaN(end) ? null : { start, end };
}

/**
 * Is there a stretch of `needed` free slots in a row?
 *
 * The question the calendar actually asks. A day with three scattered single
 * hours and a two-hour minimum has free slots and no bookable session, and
 * "has free slots" is the wrong test for whether to offer it.
 */
export function hasRunOfFreeSlots(slots: Slot[], needed: number): boolean {
  let run = 0;
  for (const slot of slots) {
    run = slot.state === "free" ? run + 1 : 0;
    if (run >= needed) return true;
  }
  return false;
}

/**
 * The calendar date of an instant in the venue's own timezone.
 *
 * Not `toISOString().slice(0, 10)`, which is the UTC date: at 01:00 in Kyiv
 * that is still yesterday, and "today" would be struck out as past.
 */
export function venueDateOf(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VENUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}
