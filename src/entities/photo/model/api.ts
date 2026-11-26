import { cacheLife, cacheTag } from "next/cache";

import { CONTENT_TAG, createPublicClient, mediaUrl } from "@/shared/api";

import type { Photo } from "./types";

/** The venue-wide gallery. Each card's own photographs live with the card. */
export async function getPhotos(): Promise<Photo[]> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, title, caption, media(storage_path, alt)")
    // A row with a room belongs to that card, not to the venue gallery --
    // which is what the column has always meant and what this query used to
    // ignore. Nothing sets a room yet, so nothing changes today.
    .is("room_id", null)
    .eq("is_visible", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load gallery: ${error.message}`);

  return (data ?? []).flatMap((p) =>
    p.media
      ? [{
          id: p.id,
          src: mediaUrl(p.media.storage_path),
          alt: p.media.alt,
          title: p.title,
          caption: p.caption,
        }]
      : [],
  );
}
