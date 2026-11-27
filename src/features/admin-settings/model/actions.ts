"use server";

import { updateTag } from "next/cache";

import type { SocialKind } from "@/entities/settings/ui/social-icon";
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
  openingHoursNote: string;
  minDurationMinutes: number;
  bufferMinutes: number;
  slotStepMinutes: number;
  /** How long a slot stays held while the guest telephones. */
  holdMinutes: number;
};

/** One weekday of the venue's week. `weekday` is Postgres's: 0 is Sunday. */
export type DayHours = {
  weekday: number;
  isClosed: boolean;
  /** "HH:MM", as the time input wants it. */
  opensAt: string;
  closesAt: string;
};

/** One place the venue can be found. `id` is null until it is saved. */
export type SocialRow = {
  id: string | null;
  kind: SocialKind;
  url: string;
  label: string;
  isVisible: boolean;
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
  social: SocialRow[];
};

export type SettingsResult = { ok: true } | { ok: false; message: string };

/**
 * A handle where a link is expected, turned into the link.
 *
 * The owner knows the venue as "@banya_staraya_doroga", not as a URL, and
 * typing the wrong one is how a Telegram button ends up opening a web page
 * that then asks to open Telegram. Anything that already looks like an
 * address is left exactly as it is.
 */
function asUrl(kind: SocialKind, value: string): string {
  const text = value.trim();
  if (text === "" || /^[a-z][a-z0-9+.-]*:/i.test(text)) return text;

  const handle = text.replace(/^@/, "");
  const digits = text.replace(/[^\d]/g, "");

  switch (kind) {
    case "telegram":
      return `https://t.me/${handle}`;
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
    case "facebook":
      return `https://facebook.com/${handle}`;
    case "youtube":
      return `https://youtube.com/@${handle}`;
    // These two are reached by telephone number, not by name.
    case "whatsapp":
      return digits ? `https://wa.me/${digits}` : text;
    case "viber":
      return digits ? `viber://chat?number=%2B${digits}` : text;
    default:
      return text;
  }
}

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

/** "09:00:00" from the database, "09:00" for an `input type=time`. */
const asTime = (v: string | null) => (v ?? "").slice(0, 5);

export async function getVenueConfig(): Promise<VenueConfig> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const [{ data: s, error }, { data: hours }, { data: closures }, { data: social }] =
    await Promise.all([
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
      // The admin client is the administrator, so the policy lets hidden
      // rows through — which is the point: they are hidden on the site, not
      // from the person who hid them.
      supabase.from("social_links").select("id, kind, url, label, is_visible").order("sort_order"),
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
      openingHoursNote: s.opening_hours_note,
      minDurationMinutes: s.min_duration_minutes,
      bufferMinutes: s.buffer_minutes,
      slotStepMinutes: s.slot_step_minutes,
      holdMinutes: s.hold_minutes,
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
    social: (social ?? []).map((l) => ({
      id: l.id,
      kind: l.kind,
      url: l.url,
      label: l.label ?? "",
      isVisible: l.is_visible,
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
        opening_hours_note: config.settings.openingHoursNote,
        min_duration_minutes: config.settings.minDurationMinutes,
        buffer_minutes: config.settings.bufferMinutes,
        slot_step_minutes: config.settings.slotStepMinutes,
        hold_minutes: config.settings.holdMinutes,
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
      social: config.social
        // A row with no address is a row the owner started and left; it is
        // dropped rather than refused, which would block the whole save.
        .filter((l) => l.url.trim() !== "")
        .map((l) => ({
          id: l.id,
          kind: l.kind,
          url: asUrl(l.kind, l.url),
          label: l.label,
          is_visible: l.isVisible,
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
