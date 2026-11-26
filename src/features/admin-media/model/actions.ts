"use server";

import { updateTag } from "next/cache";

import { CONTENT_TAG, createSupabaseServerClient, getAdmin, mediaUrl } from "@/shared/api";

/** Where a file is used, in words the owner reads rather than table names. */
export type MediaUse = { kind: "room_cover" | "room_photo" | "gallery" | "block"; label: string };

export type MediaItem = {
  id: string;
  path: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  uses: MediaUse[];
};

export type MediaResult = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

const isUseKind = (v: string): v is MediaUse["kind"] =>
  v === "room_cover" || v === "room_photo" || v === "gallery" || v === "block";

/**
 * The whole library, newest first, each file carrying the places that point
 * at it.
 *
 * The usage comes from one database function rather than four queries here,
 * because the same list has to be right at the moment of deletion — and the
 * place that decides what deleting detaches is `public.delete_media`. Two
 * descriptions of "what references a file" would drift.
 */
export async function getMediaLibrary(): Promise<MediaItem[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const [{ data: media, error }, { data: usage, error: usageError }] = await Promise.all([
    supabase
      .from("media")
      .select("id, storage_path, alt, width, height, created_at")
      .order("created_at", { ascending: false }),
    supabase.rpc("media_usage"),
  ]);

  if (error) throw new Error(`Failed to load media: ${error.message}`);
  if (usageError) throw new Error(`Failed to load media usage: ${usageError.message}`);

  const uses = new Map<string, MediaUse[]>();
  for (const row of usage ?? []) {
    if (!isUseKind(row.kind)) continue;
    const list = uses.get(row.media_id) ?? [];
    list.push({ kind: row.kind, label: row.label });
    uses.set(row.media_id, list);
  }

  return (media ?? []).map((m) => ({
    id: m.id,
    path: m.storage_path,
    url: mediaUrl(m.storage_path),
    alt: m.alt,
    width: m.width,
    height: m.height,
    createdAt: m.created_at,
    uses: uses.get(m.id) ?? [],
  }));
}

/**
 * Records a file the browser has already put in the bucket.
 *
 * Only the reference travels through the action; the bytes went straight to
 * Storage. If this fails the caller removes the object again, so a failed
 * upload does not leave a file nobody can see or delete.
 */
export async function recordUpload(file: {
  storagePath: string;
  alt: string;
  width: number | null;
  height: number | null;
}): Promise<MediaResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("media").insert({
    storage_path: file.storagePath,
    alt: file.alt,
    width: file.width,
    height: file.height,
  });

  if (error) return { ok: false, message: `Не вдалося зберегти файл: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}

export async function updateMediaAlt(id: string, alt: string): Promise<MediaResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("media").update({ alt }).eq("id", id);

  if (error) return { ok: false, message: `Не вдалося зберегти опис: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}

/**
 * Deletes files and everything that points at them.
 *
 * Two steps, in this order on purpose. The rows go first, in one transaction,
 * so a file can never be half-detached — the panel has already shown what
 * that will take with it. The bytes go second, through the Storage API,
 * because Supabase forbids deleting from storage.objects in SQL; see
 * 20261126210100_media_delete_via_storage_api.sql.
 *
 * If the second step fails, the site is already correct and an unreferenced
 * object is left in the bucket. That is said out loud rather than swallowed,
 * but it is not treated as a failed deletion, because the deletion worked.
 */
export async function deleteMedia(ids: string[]): Promise<MediaResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();

  // Read the paths before the rows are gone: afterwards there is nothing
  // left to say which objects belonged to them.
  const { data: rows } = await supabase.from("media").select("storage_path").in("id", ids);
  const paths = (rows ?? []).map((r) => r.storage_path);

  const { error } = await supabase.rpc("delete_media", { ids });
  if (error) return { ok: false, message: `Не вдалося видалити: ${error.message}` };

  updateTag(CONTENT_TAG);

  if (paths.length > 0) {
    const { data: removed, error: storageError } = await supabase.storage
      .from("media")
      .remove(paths);

    // Storage reports an empty list, not an error, when it deletes nothing --
    // which is what it did while the administrator had no select policy on
    // the bucket and therefore could not see the objects to delete them. The
    // count is checked because the error alone said everything was fine.
    const missed = paths.length - (removed?.length ?? 0);
    if (storageError || missed > 0) {
      return {
        ok: false,
        message:
          "Зображення прибрано з сайту, але файли залишилися у сховищі" +
          (storageError ? `: ${storageError.message}` : ` (${missed}).`),
      };
    }
  }

  return { ok: true };
}
