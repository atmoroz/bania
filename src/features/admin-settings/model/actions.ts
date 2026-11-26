"use server";

import { updateTag } from "next/cache";

import { CONTENT_TAG, createSupabaseServerClient, getAdmin } from "@/shared/api";

export type VenueSettings = {
  siteTitle: string;
  wordmark: string;
  phoneDisplay: string;
  phoneE164: string;
  extraPhoneDisplay: string;
  email: string;
  address: string;
  mapUrl: string;
  instagramHandle: string;
  instagramUrl: string;
  openingHoursNote: string;
  minDurationMinutes: number;
  bufferMinutes: number;
  slotStepMinutes: number;
};

/** One weekday of the venue's week. `weekday` is Postgres's: 0 is Sunday. */
export type DayHours = {
  weekday: number;
  isClosed: boolean;
  /** "HH:MM", as the time input wants it. */
  opensAt: string;
  closesAt: string;
};

export type Closure = {
  id: string | null;
  startsOn: string;
  endsOn: string;
  reason: string;
};

export type VenueConfig = {
  settings: VenueSettings;
  hours: DayHours[];
  closures: Closure[];
};

export type SettingsResult = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

/** "09:00:00" from the database, "09:00" for an `input type=time`. */
const asTime = (v: string | null) => (v ?? "").slice(0, 5);

export async function getVenueConfig(): Promise<VenueConfig> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const [{ data: s, error }, { data: hours }, { data: closures }] = await Promise.all([
    supabase.from("settings").select("*").maybeSingle(),
    supabase
      .from("opening_hours")
      .select("weekday, opens_at, closes_at, is_closed")
      .is("room_id", null)
      .order("weekday"),
    supabase
      .from("closures")
      .select("id, starts_on, ends_on, reason")
      .is("room_id", null)
      .order("starts_on"),
  ]);

  if (error) throw new Error(`Failed to load the settings: ${error.message}`);
  if (!s) throw new Error("The settings row is missing");

  const byWeekday = new Map((hours ?? []).map((h) => [h.weekday, h]));

  return {
    settings: {
      siteTitle: s.site_title,
      wordmark: s.wordmark,
      phoneDisplay: s.phone_display,
      phoneE164: s.phone_e164,
      extraPhoneDisplay: s.extra_phone_display ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      mapUrl: s.map_url ?? "",
      instagramHandle: s.instagram_handle ?? "",
      instagramUrl: s.instagram_url ?? "",
      openingHoursNote: s.opening_hours_note,
      minDurationMinutes: s.min_duration_minutes,
      bufferMinutes: s.buffer_minutes,
      slotStepMinutes: s.slot_step_minutes,
    },
    // Always seven rows, whatever the table holds: a weekday with no row is
    // a day the venue is closed, and the form has to be able to open it.
    hours: Array.from({ length: 7 }, (_, weekday) => {
      const row = byWeekday.get(weekday);
      return {
        weekday,
        isClosed: row?.is_closed ?? true,
        opensAt: asTime(row?.opens_at ?? null) || "09:00",
        closesAt: asTime(row?.closes_at ?? null) || "22:00",
      };
    }),
    closures: (closures ?? []).map((c) => ({
      id: c.id,
      startsOn: c.starts_on,
      endsOn: c.ends_on,
      reason: c.reason ?? "",
    })),
  };
}

/**
 * Saves contacts, booking rules, weekly hours and closures together.
 *
 * One transaction, because they are one screen and half of them is worse
 * than none: hours that changed while the buffer did not is a calendar that
 * lies. See `20261126260000_save_settings.sql`.
 */
export async function saveVenueConfig(config: VenueConfig): Promise<SettingsResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_settings", {
    payload: {
      settings: {
        site_title: config.settings.siteTitle,
        wordmark: config.settings.wordmark,
        phone_display: config.settings.phoneDisplay,
        phone_e164: config.settings.phoneE164,
        extra_phone_display: config.settings.extraPhoneDisplay,
        email: config.settings.email,
        address: config.settings.address,
        map_url: config.settings.mapUrl,
        instagram_handle: config.settings.instagramHandle,
        instagram_url: config.settings.instagramUrl,
        opening_hours_note: config.settings.openingHoursNote,
        min_duration_minutes: config.settings.minDurationMinutes,
        buffer_minutes: config.settings.bufferMinutes,
        slot_step_minutes: config.settings.slotStepMinutes,
      },
      hours: config.hours.map((h) => ({
        weekday: h.weekday,
        is_closed: h.isClosed,
        opens_at: h.opensAt,
        closes_at: h.closesAt,
      })),
      closures: config.closures.map((c) => ({
        id: c.id,
        starts_on: c.startsOn,
        ends_on: c.endsOn,
        reason: c.reason,
      })),
    },
  });

  if (error) {
    // The table refuses an open day without a sensible pair of times. Said
    // in the owner's words, since the constraint's own name explains nothing.
    if (error.message.includes("opening_hours_times_coherent")) {
      return {
        ok: false,
        message: "У відчиненого дня час закриття має бути пізніше за час відкриття.",
      };
    }
    if (error.message.includes("closures_range_ordered")) {
      return { ok: false, message: "У закритого періоду кінець не може бути раніше початку." };
    }
    return { ok: false, message: `Не вдалося зберегти: ${error.message}` };
  }

  updateTag(CONTENT_TAG);
  return { ok: true };
}
