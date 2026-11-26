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

/** The whole catalogue, hidden cards included, in display order. */
export async function getAdminRooms(): Promise<AdminRoom[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: minimums }] = await Promise.all([
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
  ]);

  if (error) throw new Error(`Failed to load the catalogue: ${error.message}`);

  const minimumBySlug = new Map((minimums ?? []).map((m) => [m.slug, m.minimum_minutes]));

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
    // The one failure the owner can actually fix, said in their words.
    const message = error.message.includes("rooms_slug_key")
      ? "Адреса вже зайнята іншою карткою. Змініть її."
      : `Не вдалося зберегти: ${error.message}`;
    return { ok: false, message };
  }

  updateTag(CONTENT_TAG);
  return { ok: true };
}
