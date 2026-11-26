"use server";

import { updateTag } from "next/cache";

import { CONTENT_TAG, createSupabaseServerClient, getAdmin, mediaUrl } from "@/shared/api";

/** One photograph attached to a card. */
export type RoomPhoto = { mediaId: string; path: string; url: string; alt: string };

export type AdminRoom = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  capacity: number | null;
  pricePerHour: number | null;
  highlights: string[];
  ctaLabel: string;
  isFeatured: boolean;
  isVisible: boolean;
  acceptsBookings: boolean;
  /** NULL means "inherit the venue default"; see the column's comment. */
  minDurationMinutes: number | null;
  /** What the database will actually enforce, override or default. */
  minimumMinutes: number;
  cover: { mediaId: string; path: string; url: string } | null;
  photos: RoomPhoto[];
  /** Ids of the cards this one is made of; empty when it stands alone. */
  componentIds: string[];
  /**
   * Why this card cannot be removed, if it cannot. Bookings keep a card
   * forever; being part of a set keeps it until the set lets go.
   */
  lock: { bookings: number; partOf: number };
};

export type RoomDraft = {
  id: string | null;
  slug: string;
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  capacity: number | null;
  pricePerHour: number | null;
  highlights: string[];
  ctaLabel: string;
  isFeatured: boolean;
  isVisible: boolean;
  acceptsBookings: boolean;
  minDurationMinutes: number | null;
  coverMediaId: string | null;
  photoMediaIds: string[];
  componentIds: string[];
};

export type RoomResult = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

/**
 * The venue's own minimum, in minutes.
 *
 * The panel needs it to preview a card that inherits rather than overrides:
 * the resolved figure it loaded with is the old one the moment the override
 * is cleared.
 */
export async function getVenueMinimumMinutes(): Promise<number> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("settings").select("min_duration_minutes").maybeSingle();
  return data?.min_duration_minutes ?? 60;
}

/** The whole catalogue, hidden cards included, in display order. */
export async function getAdminRooms(): Promise<AdminRoom[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: minimums }, { data: locks }] = await Promise.all([
    supabase
      .from("rooms")
      .select(
        `id, slug, name, eyebrow, short_description, description, capacity,
         price_per_hour, highlights, cta_label, is_featured, is_visible,
         accepts_bookings, min_duration_minutes,
         cover:media!rooms_cover_media_id_fkey(id, storage_path),
         photos:room_photos(sort_order, media(id, storage_path, alt)),
         components:room_components!room_components_room_id_fkey(component_id)`,
      )
      .order("sort_order"),
    supabase.rpc("room_minimums"),
    supabase.rpc("room_locks"),
  ]);

  if (error) throw new Error(`Failed to load the catalogue: ${error.message}`);

  const minimumBySlug = new Map((minimums ?? []).map((m) => [m.slug, m.minimum_minutes]));
  const lockById = new Map((locks ?? []).map((l) => [l.room_id, l]));

  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    eyebrow: r.eyebrow ?? "",
    summary: r.short_description ?? "",
    description: r.description ?? "",
    capacity: r.capacity,
    pricePerHour: r.price_per_hour,
    highlights: r.highlights,
    ctaLabel: r.cta_label ?? "",
    isFeatured: r.is_featured,
    isVisible: r.is_visible,
    acceptsBookings: r.accepts_bookings,
    minDurationMinutes: r.min_duration_minutes,
    minimumMinutes: minimumBySlug.get(r.slug) ?? 60,
    cover: r.cover
      ? { mediaId: r.cover.id, path: r.cover.storage_path, url: mediaUrl(r.cover.storage_path) }
      : null,
    photos: [...r.photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((p) =>
        p.media
          ? [
              {
                mediaId: p.media.id,
                path: p.media.storage_path,
                url: mediaUrl(p.media.storage_path),
                alt: p.media.alt,
              },
            ]
          : [],
      ),
    componentIds: r.components.map((c) => c.component_id),
    lock: {
      bookings: Number(lockById.get(r.id)?.bookings ?? 0),
      partOf: Number(lockById.get(r.id)?.part_of ?? 0),
    },
  }));
}

/**
 * Saves the catalogue in one request and one transaction.
 *
 * A card is not one row — it has fields, an ordered set of photographs and,
 * when it is a bundle, its parts — so saving piecemeal would leave a card
 * half-edited whenever one write failed. See `20261126240000_save_rooms.sql`.
 */
export async function saveRooms(items: RoomDraft[]): Promise<RoomResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_rooms", {
    items: items.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      eyebrow: r.eyebrow,
      short_description: r.summary,
      description: r.description,
      capacity: r.capacity,
      price_per_hour: r.pricePerHour,
      highlights: r.highlights,
      cta_label: r.ctaLabel,
      is_featured: r.isFeatured,
      is_visible: r.isVisible,
      accepts_bookings: r.acceptsBookings,
      min_duration_minutes: r.minDurationMinutes,
      cover_media_id: r.coverMediaId,
      photos: r.photoMediaIds,
      components: r.componentIds,
    })),
  });

  if (error) {
    // Two failures the owner can act on. The refusal to delete already
    // arrives as a sentence naming the card, so it is passed straight
    // through rather than wrapped in another one.
    if (error.code === "23505" || error.message.includes("rooms_slug_key")) {
      return { ok: false, message: "Адреса вже зайнята іншою карткою. Змініть її." };
    }
    if (error.code === "23503") return { ok: false, message: error.message };
    return { ok: false, message: `Не вдалося зберегти: ${error.message}` };
  }

  updateTag(CONTENT_TAG);
  return { ok: true };
}
