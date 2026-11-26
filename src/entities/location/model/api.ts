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
       price_per_hour, minimum_hours, highlights, cta_label, is_featured, sort_order,
       cover:media!rooms_cover_media_id_fkey(storage_path, alt),
       components:room_components!room_components_room_id_fkey(
         component:rooms!room_components_component_id_fkey(slug, name)
       ),
       photos:room_photos(sort_order, caption, media(storage_path, alt))`,
    )
    .eq("is_visible", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load locations: ${error.message}`);

  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    eyebrow: r.eyebrow,
    summary: r.short_description,
    description: r.description,
    capacity: r.capacity,
    pricePerHour: r.price_per_hour,
    minimumHours: r.minimum_hours,
    highlights: r.highlights,
    ctaLabel: r.cta_label,
    isFeatured: r.is_featured,
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
