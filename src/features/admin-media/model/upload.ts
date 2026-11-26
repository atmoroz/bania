"use client";

import { createSupabaseBrowserClient } from "@/shared/api/supabase-browser";

import { recordUpload } from "./actions";
import { prepareForUpload } from "./compress";

/** Mirrors the bucket's own allowed_mime_types, so the browser rejects a file
 *  with a sentence instead of letting Storage reject it with a code. */
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif"];

/** The bucket's own ceiling, applied to what is actually stored. */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * A sanity limit on what is opened for resizing. A phone photograph is
 * routinely over the bucket's 10 MB, and refusing it would be an arbitrary
 * wall when the stored file ends up a few hundred kilobytes; this only stops
 * something absurd from being decoded into memory.
 */
const MAX_SOURCE_BYTES = 60 * 1024 * 1024;

export type UploadOutcome = {
  uploaded: number;
  errors: string[];
  /** Bytes chosen, and bytes actually stored, so the saving can be shown. */
  originalBytes: number;
  storedBytes: number;
};

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
  let originalBytes = 0;
  let storedBytes = 0;

  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      errors.push(`${file.name}: підтримуються PNG, JPEG, WebP та AVIF.`);
      continue;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      errors.push(`${file.name}: завеликий файл (понад 60 МБ).`);
      continue;
    }

    // Resized and re-encoded before the size is judged: what matters is
    // what will be stored, not what came off the camera.
    const prepared = await prepareForUpload(file);
    const upload = prepared.file;

    if (upload.size > MAX_BYTES) {
      errors.push(`${file.name}: навіть після стиснення більше за 10 МБ.`);
      continue;
    }

    const path = storageName(upload.name);
    const { error } = await supabase.storage
      .from("media")
      .upload(path, upload, { contentType: upload.type, upsert: false });

    if (error) {
      errors.push(`${file.name}: ${error.message}`);
      continue;
    }

    const size = await dimensions(upload);
    const recorded = await recordUpload({ storagePath: path, alt: "", ...size });

    if (!recorded.ok) {
      await supabase.storage.from("media").remove([path]);
      errors.push(`${file.name}: ${recorded.message}`);
      continue;
    }

    uploaded += 1;
    originalBytes += prepared.originalBytes;
    storedBytes += upload.size;
  }

  return { uploaded, errors, originalBytes, storedBytes };
}
