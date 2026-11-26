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
export function UploadButton({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, startUpload] = useTransition();

  function choose(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    startUpload(async () => {
      const result = await uploadMedia(list);
      setErrors(result.errors);
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
