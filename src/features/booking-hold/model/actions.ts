"use server";

import { createPublicClient } from "@/shared/api";
import {
  buildSlots,
  hasRunOfFreeSlots,
  parseRange,
  venueDateOf,
  type BusyInterval,
  type Slot,
} from "@/shared/lib";

export type DayAvailability =
  | { open: true; slots: Slot[]; minimumMinutes: number; slotMinutes: number }
  | { open: false; reason: string };

/**
 * Slots for one card on one date.
 *
 * Deliberately a Server Action rather than a client-side query: the resolution
 * of a card into the zones it occupies, and of a date into opening hours, is a
 * rule rather than a view, and it should not be re-implemented in the browser
 * where it could drift from the database.
 */
export async function getDayAvailability(
  roomSlug: string,
  isoDate: string,
): Promise<DayAvailability> {
  const supabase = createPublicClient();

  // Release anything whose five minutes are up, so a lapsed hold never shows as
  // taken. Cheap, and this is exactly the moment it matters.
  await supabase.rpc("expire_stale_holds");

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("slug", roomSlug)
    .eq("is_visible", true)
    .maybeSingle();

  if (roomError) throw new Error(`Failed to load the room: ${roomError.message}`);
  if (!room) return { open: false, reason: "Локацію не знайдено." };

  const { data: schedule, error: scheduleError } = await supabase
    .rpc("room_schedule_for_date", { p_room_id: room.id, p_date: isoDate })
    .maybeSingle();

  if (scheduleError) throw new Error(`Failed to resolve the schedule: ${scheduleError.message}`);
  if (!schedule?.is_open || !schedule.opens_at || !schedule.closes_at) {
    return { open: false, reason: "Цього дня комплекс зачинено." };
  }

  // A bundle is busy when any of its zones is busy, so ask which zones it takes.
  const { data: units, error: unitsError } = await supabase.rpc("room_units", {
    p_room_id: room.id,
  });
  if (unitsError) throw new Error(`Failed to resolve the zones: ${unitsError.message}`);

  const unitIds = (units ?? []) as unknown as string[];

  const { data: busyRows, error: busyError } = await supabase
    .from("busy_intervals")
    .select("occupied, status")
    .in("room_id", unitIds.length > 0 ? unitIds : [room.id]);

  if (busyError) throw new Error(`Failed to load occupancy: ${busyError.message}`);

  const busy: BusyInterval[] = (busyRows ?? []).flatMap((row) => {
    // `occupied` is a tstzrange, which the type generator cannot map, so it
    // arrives as `unknown`. PostgREST sends it as its text form.
    const raw = typeof row.occupied === "string" ? row.occupied : null;
    const parsed = raw ? parseRange(raw) : null;
    return parsed ? [{ ...parsed, status: row.status ?? "CONFIRMED" }] : [];
  });

  const { data: settings } = await supabase
    .from("settings")
    .select("slot_step_minutes")
    .limit(1)
    .single();

  const slotMinutes = settings?.slot_step_minutes ?? 60;

  // The minimum is read from the database rather than written into the page,
  // so the rule the calendar states is the rule place_hold enforces.
  const { data: minimum } = await supabase.rpc("room_minimum_minutes", {
    p_room_slug: roomSlug,
  });

  return {
    open: true,
    minimumMinutes: minimum ?? 120,
    slotMinutes,
    slots: buildSlots({
      opensAt: schedule.opens_at,
      closesAt: schedule.closes_at,
      slotMinutes,
      busy,
      now: Date.now(),
    }),
  };
}

/**
 * Which days in a span still have room for a bookable session.
 *
 * "Full" means no run of consecutive free hours long enough to meet the
 * minimum — not merely "something is taken". A day holding three scattered
 * single hours against a two-hour minimum is full in every sense the visitor
 * cares about, and showing it as available only wastes their click.
 */
export async function getRangeAvailability(
  roomSlug: string,
  fromIso: string,
  toIso: string,
): Promise<{ fullDates: string[]; closedDates: string[] }> {
  const supabase = createPublicClient();
  await supabase.rpc("expire_stale_holds");

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("slug", roomSlug)
    .eq("is_visible", true)
    .maybeSingle();

  if (!room) return { fullDates: [], closedDates: [] };

  const [{ data: days }, { data: units }, { data: settings }] = await Promise.all([
    supabase.rpc("room_schedule_for_range", {
      p_room_id: room.id,
      p_from: fromIso,
      p_to: toIso,
    }),
    supabase.rpc("room_units", { p_room_id: room.id }),
    supabase.from("settings").select("slot_step_minutes").limit(1).single(),
  ]);

  const unitIds = (units ?? []) as unknown as string[];
  const slotMinutes = settings?.slot_step_minutes ?? 60;

  // One query for the whole span rather than one per day. The view is already
  // filtered to visible rooms and carries no customer data.
  const { data: busyRows } = await supabase
    .from("busy_intervals")
    .select("occupied, status")
    .in("room_id", unitIds.length > 0 ? unitIds : [room.id]);

  const busy: BusyInterval[] = (busyRows ?? []).flatMap((row) => {
    const raw = typeof row.occupied === "string" ? row.occupied : null;
    const parsed = raw ? parseRange(raw) : null;
    return parsed ? [{ ...parsed, status: row.status ?? "CONFIRMED" }] : [];
  });

  const now = Date.now();
  const fullDates: string[] = [];
  const closedDates: string[] = [];

  // Days already gone are reported as neither. They are unselectable anyway,
  // and marking them "full" would strike out half the month and leave the
  // mark meaning nothing where it matters.
  const todayIso = venueDateOf(new Date(now));

  for (const day of days ?? []) {
    if (day.day < todayIso) continue;

    if (!day.is_open || !day.opens_at || !day.closes_at) {
      closedDates.push(day.day);
      continue;
    }

    const slots = buildSlots({
      opensAt: day.opens_at,
      closesAt: day.closes_at,
      slotMinutes,
      busy,
      now,
    });

    const needed = Math.ceil((day.min_duration_minutes ?? 120) / slotMinutes);
    if (!hasRunOfFreeSlots(slots, needed)) fullDates.push(day.day);
  }

  return { fullDates, closedDates };
}

export type HoldResult =
  | { ok: true; bookingIds: string[]; expiresAt: string }
  | { ok: false; message: string };

/**
 * Place a five-minute hold on the chosen slots.
 *
 * All the real work is in the `place_hold` database function: merging contiguous
 * slots, expanding a bundle into its zones, capping concurrent holds, and
 * refusing anything already taken. Putting it there means the browser cannot
 * talk the server into a shape it should not write.
 */
export async function placeHold(
  roomSlug: string,
  slotStarts: string[],
): Promise<HoldResult> {
  if (slotStarts.length === 0) {
    return { ok: false, message: "Оберіть хоча б один сеанс." };
  }

  const supabase = createPublicClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("slot_step_minutes")
    .limit(1)
    .single();

  const { data, error } = await supabase.rpc("place_hold", {
    p_room_slug: roomSlug,
    p_slot_starts: slotStarts,
    p_slot_minutes: settings?.slot_step_minutes ?? 60,
  });

  if (error) {
    // The exclusion constraint is the expected failure here: somebody took the
    // slot between the page loading and the button being pressed.
    const taken = error.message.includes("booking_rooms_no_overlap");
    const tooShort = error.message.includes("must be at least");
    return {
      ok: false,
      message: taken
        ? "Цей час щойно зайняли. Оновіть сторінку та оберіть інший."
        : tooShort
          ? "Кожен відрізок має бути щонайменше 2 години поспіль."
          : "Не вдалося створити бронь. Спробуйте ще раз або зателефонуйте адміністратору.",
    };
  }

  return {
    ok: true,
    bookingIds: (data ?? []) as unknown as string[],
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
}
