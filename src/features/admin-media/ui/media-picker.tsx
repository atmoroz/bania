"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { cn } from "@/shared/lib";
// Straight from the module, not the barrel: the barrel also exports the
// cookie-aware server client, which reaches for next/headers.
import { mediaUrl } from "@/shared/api/supabase";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui";

import { getMediaLibrary, type MediaItem } from "../model/actions";
import { UploadButton } from "./upload-button";

/**
 * Chooses one image from the library, anywhere one is needed.
 *
 * One component rather than a picker per place: the banner, a card's cover
 * and a gallery tile are the same decision, and three versions of it would
 * be three places to fix the day uploading changes.
 *
 * The value is a storage path, which is how `page_blocks` already references
 * an image inside its jsonb.
 */
export function MediaPicker({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [loading, startLoad] = useTransition();

  // Loaded when the dialog opens rather than on mount: a field the owner
  // never touches should not fetch the whole library.
  function load() {
    startLoad(async () => setItems(await getMediaLibrary()));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="label-caps text-muted-foreground">{label}</span>

      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          <span className="border-bronze/20 relative block size-24 shrink-0 border">
            <Image
              src={mediaUrl(value)}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          </span>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(true);
              load();
            }}
          >
            <ImagePlus className="size-4" aria-hidden />
            {value ? "Замінити" : "Обрати зображення"}
          </Button>

          {value ? (
            <Button type="button" variant="ghost" onClick={() => onChange(undefined)}>
              <X className="size-4" aria-hidden />
              Прибрати
            </Button>
          ) : null}
        </div>
      </div>

      {value ? <span className="text-muted-foreground/70 text-[12px]">{value}</span> : null}
      {hint ? <span className="text-muted-foreground/70 text-[12px] leading-4">{hint}</span> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>Медіатека</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2 text-[15px]">
            Оберіть зображення або завантажте нове.
          </DialogDescription>

          <div className="mt-6">
            <UploadButton onUploaded={load} />
          </div>

          {loading && items === null ? (
            <p className="text-muted-foreground mt-6 flex items-center gap-2 text-[15px]">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Завантаження…
            </p>
          ) : null}

          {items !== null ? (
            items.length === 0 ? (
              <p className="text-muted-foreground mt-6 text-[15px]">
                У медіатеці поки порожньо.
              </p>
            ) : (
              <ul className="mt-6 grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto md:grid-cols-4">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(item.path);
                        setOpen(false);
                      }}
                      className={cn(
                        "relative block aspect-square w-full border transition-colors",
                        item.path === value
                          ? "border-bronze"
                          : "border-bronze/15 hover:border-bronze/60",
                      )}
                    >
                      <Image
                        src={item.url}
                        alt={item.alt}
                        fill
                        sizes="(min-width: 768px) 160px, 30vw"
                        className="object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
