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
 * WebP at 2560 px takes a typical phone photograph to a few hundred
 * kilobytes with no visible difference at the sizes the site uses.
 */

/** Wider than any image this site renders, with room for a retina screen. */
const MAX_EDGE = 2560;
const QUALITY = 0.82;

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
