"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getAdmin } from "@/shared/api";
import { buildSlots, parseRange, type BusyInterval } from "@/shared/lib";

/** A slot as the administrator sees it: with who booked it, and what can be done. */
export type AdminSlot = {
  startsAt: string;
  endsAt: string;
  label: string;
  state: "free" | "pending" | "confirmed" | "past";
  booking: {
    id: string;
    customerName: string | null;
    customerPhone: string | null;
    note: string | null;
    holdExpiresAt: string | null;
  } | null;
};

export type AdminDay =
  | { open: true; slots: AdminSlot[] }
  | { open: false; reason: string };

/**
 * Every action here re-checks the administrator.
 *
 * RLS would refuse the write anyway, but a policy failure surfaces as an
 * opaque database error. Checking first turns it into a sentence, and keeps
 * the rule visible in the code that relies on it.
 */
async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Доступ лише для адміністратора.");
  return admin;
}

export async function getAdminDay(roomSlug: string, isoDate: string): Promise<AdminDay> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  await supabase.rpc("expire_stale_holds");

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("slug", roomSlug)
    .maybeSingle();
  if (!room) return { open: false, reason: "Локацію не знайдено." };

  const { data: schedule } = await supabase
    .rpc("room_schedule_for_date", { p_room_id: room.id, p_date: isoDate })
    .maybeSingle();

  if (!schedule?.is_open || !schedule.opens_at || !schedule.closes_at) {
    return { open: false, reason: "Цього дня комплекс зачинено." };
  }

  const { data: units } = await supabase.rpc("room_units", { p_room_id: room.id });
  const unitIds = ((units ?? []) as unknown as string[]).length
    ? ((units ?? []) as unknown as string[])
    : [room.id];

  // The administrator may read bookings, so this joins through to the customer
  // rather than going via busy_intervals, which exists to hide exactly that.
  const { data: rows, error } = await supabase
    .from("booking_rooms")
    .select(
      "occupied, is_active, booking:bookings(id, status, customer_name, customer_phone, note, hold_expires_at)",
    )
    .in("room_id", unitIds)
    .eq("is_active", true);

  if (error) throw new Error(`Не вдалося завантажити броні: ${error.message}`);

  const busy: (BusyInterval & { booking: NonNullable<AdminSlot["booking"]>; status: string })[] =
    (rows ?? []).flatMap((row) => {
      const raw = typeof row.occupied === "string" ? row.occupied : null;
      const parsed = raw ? parseRange(raw) : null;
      if (!parsed || !row.booking) return [];
      return [{
        ...parsed,
        status: row.booking.status,
        booking: {
          id: row.booking.id,
          customerName: row.booking.customer_name,
          customerPhone: row.booking.customer_phone,
          note: row.booking.note,
          holdExpiresAt: row.booking.hold_expires_at,
        },
      }];
    });

  const { data: settings } = await supabase
    .from("settings")
    .select("slot_step_minutes")
    .limit(1)
    .single();

  const base = buildSlots({
    opensAt: schedule.opens_at,
    closesAt: schedule.closes_at,
    slotMinutes: settings?.slot_step_minutes ?? 60,
    busy,
    now: Date.now(),
  });

  const slots: AdminSlot[] = base.map((slot) => {
    const start = new Date(slot.startsAt).getTime();
    const end = new Date(slot.endsAt).getTime();
    const hit = busy.find((b) => start < b.end && b.start < end);

    if (!hit) {
      return { ...slot, state: slot.state === "past" ? "past" : "free", booking: null };
    }
    return {
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      label: slot.label,
      state: hit.status === "PENDING" ? "pending" : "confirmed",
      booking: hit.booking,
    };
  });

  return { open: true, slots };
}

export type ActionResult = { ok: true } | { ok: false; message: string };

/** Turn a hold into a booking. The customer's details arrive from the call. */
export async function confirmBooking(
  bookingId: string,
  customerName: string,
  customerPhone: string,
): Promise<ActionResult> {
  await requireAdmin();

  // Optional, as on creation: a slot held by someone who rang off before
  // giving a name is still a slot that is taken.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "CONFIRMED",
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone.trim() || null,
      hold_expires_at: null,
    })
    .eq("id", bookingId);

  if (error) return { ok: false, message: `Не вдалося підтвердити: ${error.message}` };
  revalidatePath("/admin/bookings");
  return { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "CANCELLED" })
    .eq("id", bookingId);

  if (error) return { ok: false, message: `Не вдалося скасувати: ${error.message}` };
  revalidatePath("/admin/bookings");
  return { ok: true };
}

/**
 * Record a booking taken by telephone, without the visitor having held it.
 *
 * Goes through the same place_hold function as the public side so the merging
 * of contiguous slots and the expansion of a bundle into its zones is defined
 * once, then confirms the result immediately.
 */
export async function createBooking(
  roomSlug: string,
  slotStarts: string[],
  customerName: string,
  customerPhone: string,
  note: string,
): Promise<ActionResult> {
  await requireAdmin();

  if (slotStarts.length === 0) return { ok: false, message: "Оберіть сеанс." };

  // Name and phone are optional. The owner takes bookings mid-call and may
  // have the time settled before the name; blocking the booking on a field
  // they can fill in later would cost them the slot, not improve the record.

  const supabase = await createSupabaseServerClient();
  const { data: step } = await supabase
    .from("settings")
    .select("slot_step_minutes")
    .limit(1)
    .single();

  const { data: ids, error } = await supabase.rpc("place_hold", {
    p_room_slug: roomSlug,
    p_slot_starts: slotStarts,
    p_slot_minutes: step?.slot_step_minutes ?? 60,
  });

  if (error) {
    const taken = error.message.includes("booking_rooms_no_overlap");
    const tooShort = error.message.includes("must be at least");
    return {
      ok: false,
      message: taken
        ? "Цей час уже зайнятий."
        : tooShort
          ? "Бронь не може бути коротшою за мінімум. Оберіть кілька годин поспіль."
          : `Не вдалося створити бронь: ${error.message}`,
    };
  }

  const { error: confirmError } = await supabase
    .from("bookings")
    .update({
      status: "CONFIRMED",
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone.trim() || null,
      note: note.trim() || null,
      hold_expires_at: null,
    })
    .in("id", (ids ?? []) as unknown as string[]);

  if (confirmError) {
    return { ok: false, message: `Бронь створено, але не підтверджено: ${confirmError.message}` };
  }

  revalidatePath("/admin/bookings");
  return { ok: true };
}
