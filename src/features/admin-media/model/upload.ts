"use client";

import { createSupabaseBrowserClient } from "@/shared/api/supabase-browser";

import { recordUpload } from "./actions";

/** Mirrors the bucket's own allowed_mime_types, so the browser rejects a file
 *  with a sentence instead of letting Storage reject it with a code. */
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif"];
const MAX_BYTES = 10 * 1024 * 1024;

export type UploadOutcome = { uploaded: number; errors: string[] };

/** A name that is safe in a URL and cannot collide with an existing object. */
function storageName(original: string): string {
  const dot = original.lastIndexOf(".");
  const base = dot > 0 ? original.slice(0, dot) : original;
  const ext = (dot > 0 ? original.slice(dot + 1) : "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${slug || "photo"}-${suffix}.${ext || "jpg"}`;
}

/** Pixel size, for the record. Failure is not an error: the columns are nullable. */
async function dimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

/**
 * Puts files in the bucket and records each one in `media`.
 *
 * The bytes go straight from the browser to Storage under the
 * administrator's session; only the resulting path goes through a Server
 * Action. If recording fails the object is removed again, because a file in
 * the bucket with no row is invisible to the panel and therefore impossible
 * to clean up from it.
 */
export async function uploadMedia(files: File[]): Promise<UploadOutcome> {
  const supabase = createSupabaseBrowserClient();
  const errors: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      errors.push(`${file.name}: підтримуються PNG, JPEG, WebP та AVIF.`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name}: більше за 10 МБ.`);
      continue;
    }

    const path = storageName(file.name);
    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      errors.push(`${file.name}: ${error.message}`);
      continue;
    }

    const size = await dimensions(file);
    const recorded = await recordUpload({ storagePath: path, alt: "", ...size });

    if (!recorded.ok) {
      await supabase.storage.from("media").remove([path]);
      errors.push(`${file.name}: ${recorded.message}`);
      continue;
    }

    uploaded += 1;
  }

  return { uploaded, errors };
}
