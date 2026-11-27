import { cacheLife, cacheTag } from "next/cache";

import { CONTENT_TAG, createPublicClient, mediaUrl } from "@/shared/api";

import type { Location } from "./types";

/**
 * The catalogue of bookable cards, in the owner's order.
 *
 * A card may be composed of others — "Banya #1 + chan" lists both — which is what
 * makes booking the bundle occupy each part. See
 * docs/decisions/0011-one-catalogue-of-composable-cards.md.
 */
export async function getLocations(): Promise<Location[]> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      `slug, name, eyebrow, short_description, description, capacity,
       price_per_hour, highlights, cta_label, is_featured, accepts_bookings, sort_order,
       cover:media!rooms_cover_media_id_fkey(storage_path, alt),
       components:room_components!room_components_room_id_fkey(
         component:rooms!room_components_component_id_fkey(slug, name)
       ),
       photos:room_photos(sort_order, caption, media(storage_path, alt))`,
    )
    .eq("is_visible", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load locations: ${error.message}`);

  // The minimum each card actually enforces, resolved by the database from the
  // card's own override or the venue default. Asked for rather than stored on
  // the row, so the figure on the card is the figure place_hold will apply —
  // they used to be two numbers kept in step by hand, and they would not have
  // stayed in step past the first change to the venue setting.
  const { data: minimums } = await supabase.rpc("room_minimums");
  const minimumBySlug = new Map((minimums ?? []).map((m) => [m.slug, m.minimum_minutes]));

  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    eyebrow: r.eyebrow,
    summary: r.short_description,
    description: r.description,
    capacity: r.capacity,
    pricePerHour: r.price_per_hour,
    minimumMinutes: minimumBySlug.get(r.slug) ?? 60,
    highlights: r.highlights,
    ctaLabel: r.cta_label,
    isFeatured: r.is_featured,
    acceptsBookings: r.accepts_bookings,
    image: r.cover
      ? { src: mediaUrl(r.cover.storage_path), alt: r.cover.alt }
      : null,
    partOf: r.components.map((c) => c.component.name),
    photos: [...r.photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((p) =>
        p.media
          ? [{ src: mediaUrl(p.media.storage_path), alt: p.media.alt, caption: p.caption }]
          : [],
      ),
  }));
}
