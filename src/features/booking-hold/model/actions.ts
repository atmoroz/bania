"use server";

import { createPublicClient } from "@/shared/api";
import { buildSlots, parseRange, type BusyInterval, type Slot } from "@/shared/lib";

export type DayAvailability =
  | { open: true; slots: Slot[] }
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

  return {
    open: true,
    slots: buildSlots({
      opensAt: schedule.opens_at,
      closesAt: schedule.closes_at,
      slotMinutes: settings?.slot_step_minutes ?? 120,
      busy,
      now: Date.now(),
    }),
  };
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
  const { data, error } = await supabase.rpc("place_hold", {
    p_room_slug: roomSlug,
    p_slot_starts: slotStarts,
    p_slot_minutes: 120,
  });

  if (error) {
    // The exclusion constraint is the expected failure here: somebody took the
    // slot between the page loading and the button being pressed.
    const taken = error.message.includes("booking_rooms_no_overlap");
    return {
      ok: false,
      message: taken
        ? "Цей час щойно зайняли. Оновіть сторінку та оберіть інший."
        : "Не вдалося створити бронь. Спробуйте ще раз або зателефонуйте адміністратору.",
    };
  }

  return {
    ok: true,
    bookingIds: (data ?? []) as unknown as string[],
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
}
