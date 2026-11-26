"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/shared/ui";

import { uploadMedia } from "../model/upload";

/**
 * Adds files to the library.
 *
 * A hidden input driven by a button, rather than a styled file input: the
 * native control cannot be made to match the panel, and it would be the only
 * element on the page that looks like somebody else's software.
 */
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} МБ`;

export function UploadButton({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [busy, startUpload] = useTransition();

  function choose(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    startUpload(async () => {
      const result = await uploadMedia(list);
      setErrors(result.errors);
      setSaving(
        result.uploaded > 0 && result.storedBytes < result.originalBytes
          ? `Завантажено: ${result.uploaded}. Стиснуто ${mb(result.originalBytes)} → ${mb(result.storedBytes)}.`
          : null,
      );
      if (result.uploaded > 0) onUploaded();
    });

    // Lets the same file be chosen twice in a row; without it the input keeps
    // the previous value and fires no change event.
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => choose(e.target.files)}
      />
      <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {busy ? "Завантаження…" : "Завантажити"}
      </Button>

      {/* Said here rather than left to be discovered: the file dialog filters
          silently, and nothing else on the page explains what happens to a
          photograph after it is chosen. */}
      <p className="text-muted-foreground/70 max-w-[380px] text-[12px] leading-4">
        PNG, JPEG, WebP або AVIF. Великі знімки автоматично зменшуються до 3200 px і
        зберігаються як WebP — на вигляд те саме, але в кілька разів легше.
      </p>

      {saving ? <p className="text-sage text-[13px]">{saving}</p> : null}

      {errors.length > 0 ? (
        <ul className="text-destructive flex flex-col gap-1 text-[13px]">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
