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

export async function setGalleryVisible(id: string, isVisible: boolean): Promise<GalleryResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("gallery_photos")
    .update({ is_visible: isVisible })
    .eq("id", id);

  if (error) return { ok: false, message: `Не вдалося зберегти: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}

/** Empty text means no caption at all, not a caption that is blank. */
export async function setGalleryText(
  id: string,
  text: { title: string; caption: string },
): Promise<GalleryResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("gallery_photos")
    .update({
      title: text.title.trim() || null,
      caption: text.caption.trim() || null,
    })
    .eq("id", id);

  if (error) return { ok: false, message: `Не вдалося зберегти підпис: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}

/**
 * Adds files from the library to the **front** of the gallery.
 *
 * At the front because that is where a newly added photograph is looked for:
 * it was just chosen, and the first row is what the visitor sees first. The
 * insert gives the new rows a position before everything else, then the
 * whole gallery is renumbered from one, so the order stays a clean sequence
 * rather than drifting into negative numbers over time.
 */
export async function addGalleryPhotos(mediaIds: string[]): Promise<GalleryResult> {
  await requireAdmin();
  if (mediaIds.length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("gallery_photos")
    .select("id, sort_order")
    .is("room_id", null)
    .order("sort_order");

  const first = existing?.[0]?.sort_order ?? 1;

  const { data: inserted, error } = await supabase
    .from("gallery_photos")
    .insert(
      mediaIds.map((mediaId, i) => ({
        media_id: mediaId,
        sort_order: first - mediaIds.length + i,
        is_visible: true,
      })),
    )
    .select("id");

  if (error) return { ok: false, message: `Не вдалося додати: ${error.message}` };

  const order = [...(inserted ?? []).map((r) => r.id), ...(existing ?? []).map((r) => r.id)];
  const { error: orderError } = await supabase.rpc("set_gallery_order", { ids: order });

  // The photographs are in the gallery either way; only the numbering is
  // unfinished, and the next reorder fixes it. Saying nothing would be worse
  // than saying it is cosmetic.
  if (orderError) {
    return { ok: false, message: `Додано, але не вдалося впорядкувати: ${orderError.message}` };
  }

  updateTag(CONTENT_TAG);
  return { ok: true };
}

/**
 * Takes a photograph out of the gallery.
 *
 * The file itself stays in the library — this removes a tile, not an image.
 * Deleting the file is the media tab's job, and it says what that affects.
 */
export async function removeGalleryPhoto(id: string): Promise<GalleryResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);

  if (error) return { ok: false, message: `Не вдалося прибрати: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}

/** The whole new order in one statement; see the migration for why. */
export async function reorderGallery(ids: string[]): Promise<GalleryResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_gallery_order", { ids });

  if (error) return { ok: false, message: `Не вдалося зберегти порядок: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}
