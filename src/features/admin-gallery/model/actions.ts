"use server";

import { updateTag } from "next/cache";

import { CONTENT_TAG, createSupabaseServerClient, getAdmin, mediaUrl } from "@/shared/api";

export type GalleryPhoto = {
  id: string;
  mediaId: string;
  path: string;
  url: string;
  alt: string;
  title: string;
  caption: string;
  isVisible: boolean;
};

export type GalleryResult = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

/**
 * The venue gallery, in display order, hidden tiles included.
 *
 * `room_id is null` is what makes it the venue gallery: a row with a room
 * belongs to that card instead. See the column's comment in the schema.
 */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, media_id, title, caption, is_visible, media(storage_path, alt)")
    .is("room_id", null)
    .order("sort_order");

  if (error) throw new Error(`Failed to load gallery: ${error.message}`);

  return (data ?? []).flatMap((p) =>
    p.media
      ? [
          {
            id: p.id,
            mediaId: p.media_id,
            path: p.media.storage_path,
            url: mediaUrl(p.media.storage_path),
            alt: p.media.alt,
            title: p.title ?? "",
            caption: p.caption ?? "",
            isVisible: p.is_visible,
          },
        ]
      : [],
  );
}

/**
 * What the editor sends back: the gallery exactly as it should end up.
 *
 * `id` is null for a photograph that is being added. A row the database has
 * but the array does not is removed. Position in the array is the order.
 */
export type GalleryDraft = {
  id: string | null;
  mediaId: string;
  title: string;
  caption: string;
  isVisible: boolean;
};

/**
 * Saves the whole gallery in one request and one transaction.
 *
 * The first version of this editor wrote on every action — a request per
 * caption, per hidden tile, per drag. Besides the traffic, it meant two
 * different rules in one panel: the page editor saves on a button and this
 * one did not. See `20261126230000_save_gallery.sql`.
 */
export async function saveGallery(items: GalleryDraft[]): Promise<GalleryResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_gallery", {
    items: items.map((i) => ({
      id: i.id,
      media_id: i.mediaId,
      title: i.title,
      caption: i.caption,
      is_visible: i.isVisible,
    })),
  });

  if (error) return { ok: false, message: `Не вдалося зберегти: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}
