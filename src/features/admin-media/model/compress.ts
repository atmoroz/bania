"use client";

/**
 * Shrinks a photograph in the browser before it is uploaded.
 *
 * Done here rather than on the server because the bytes already go straight
 * from the browser to Storage, and because what arrives from a phone is the
 * problem: a modern camera writes 4–8 MB at 4000 px wide, while the widest
 * this site ever draws an image is a full-bleed banner. Uploading the
 * original would spend the storage quota, the egress quota and the visitor's
 * connection on pixels no screen will show.
 *
 * The settings are deliberately cautious. Measured on a photograph from the
 * bucket, WebP quality 0.82 → 0.90 costs about 40% more bytes, and 0.90 is
 * where the difference stops being findable by pixel-peeping. Paying that is
 * worth it: the saving over the original is still several times over, and a
 * photograph of the venue is the thing being sold.
 */

/**
 * Wider than this site ever draws an image, including a full-bleed banner on
 * a large screen at twice the pixel density.
 */
const MAX_EDGE = 3200;

/** High enough that the re-encoding is not meant to be visible. */
const QUALITY = 0.9;

/**
 * Below this, a file that needs no resizing is left exactly as it is.
 *
 * Re-encoding it could only trade real quality for a saving too small to
 * matter -- and lossy WebP is at its worst on the flat graphics and text that
 * small files often are.
 */
const LEAVE_ALONE_BYTES = 1.5 * 1024 * 1024;

export type Prepared = { file: File; originalBytes: number };

function draw(bitmap: ImageBitmap, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D context");
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));

const webpName = (name: string) => `${name.replace(/\.[^.]+$/, "")}.webp`;

/**
 * Returns the file to upload, which may be the original.
 *
 * The original is kept when re-encoding does not actually help — an already
 * small WebP, or a picture whose compression beats ours. Making a file bigger
 * in the name of optimisation is the one outcome worth guarding against, and
 * it is common with flat graphics.
 */
export async function prepareForUpload(file: File): Promise<Prepared> {
  const original = { file, originalBytes: file.size };

  // A browser that cannot decode it here would also fail to draw it; the
  // upload still goes ahead with the untouched file.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return original;
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;

    if (scale === 1 && file.size <= LEAVE_ALONE_BYTES) return original;

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const blob = await toBlob(draw(bitmap, width, height));
    if (!blob) return original;

    // Resizing is worth it even when the bytes barely move, because the
    // pixels themselves are what the visitor downloads later.
    if (scale === 1 && blob.size >= file.size) return original;

    return {
      file: new File([blob], webpName(file.name), { type: "image/webp" }),
      originalBytes: file.size,
    };
  } catch {
    return original;
  } finally {
    bitmap.close();
  }
}
