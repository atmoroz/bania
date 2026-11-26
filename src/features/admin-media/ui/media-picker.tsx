"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, ImagePlus, Loader2, X } from "lucide-react";

import { cn } from "@/shared/lib";
// Straight from the module, not the barrel: the barrel also exports the
// cookie-aware server client, which reaches for next/headers.
import { mediaUrl } from "@/shared/api/supabase";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui";

import { getMediaLibrary, type MediaItem } from "../model/actions";
import { UploadButton } from "./upload-button";

/**
 * The library, as a dialog, for choosing from it.
 *
 * One component rather than a picker per place: the banner, a card's cover
 * and a gallery tile are the same decision, and three versions of it would
 * be three places to fix the day uploading changes.
 *
 * `multiple` is the difference between replacing one image and adding
 * several: picking one is a click, picking several needs a moment to choose
 * and then a confirmation, so the dialog stays open and counts.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  current,
  multiple = false,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Storage paths already in use, marked in the grid. */
  current?: readonly string[];
  multiple?: boolean;
  onPick: (items: MediaItem[]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {/* The body is mounted only while the dialog is open, so it can load
            the library on mount. Loading from the open handler instead left
            the dialog empty whenever it was opened by setting state rather
            than by clicking the trigger — which is how the gallery opens
            it. */}
        {open ? (
          <PickerBody
            current={current}
            multiple={multiple}
            onPick={onPick}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  current,
  multiple,
  onPick,
  onClose,
}: {
  current?: readonly string[];
  multiple: boolean;
  onPick: (items: MediaItem[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [loading, startLoad] = useTransition();

  const load = useCallback(() => {
    startLoad(async () => setItems(await getMediaLibrary()));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function choose(item: MediaItem) {
    if (!multiple) {
      onPick([item]);
      onClose();
      return;
    }
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(item.id)) next.add(item.id);
      return next;
    });
  }

  function confirm() {
    onPick((items ?? []).filter((i) => picked.has(i.id)));
    onClose();
  }

  return (
    <>
      <DialogTitle>Медіатека</DialogTitle>
      <DialogDescription className="text-muted-foreground mt-2 text-[15px]">
        {multiple
          ? "Позначте зображення, які додати, або завантажте нові."
          : "Оберіть зображення або завантажте нове."}
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
          <p className="text-muted-foreground mt-6 text-[15px]">У медіатеці поки порожньо.</p>
        ) : (
          <ul className="mt-6 grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto md:grid-cols-4">
            {items.map((item) => {
              const inUse = current?.includes(item.path) ?? false;
              const chosen = picked.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    aria-pressed={multiple ? chosen : undefined}
                    className={cn(
                      "relative block aspect-square w-full border transition-colors",
                      chosen || (!multiple && inUse)
                        ? "border-bronze"
                        : "border-bronze/15 hover:border-bronze/60",
                    )}
                  >
                    <Image
                      src={item.url}
                      alt={item.alt}
                      fill
                      sizes="(min-width: 768px) 160px, 30vw"
                      className={cn("object-cover", multiple && inUse && !chosen && "opacity-35")}
                    />
                    {chosen ? (
                      <span
                        aria-hidden
                        className="border-bronze bg-bronze text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border"
                      >
                        <Check className="size-4" />
                      </span>
                    ) : null}
                    {multiple && inUse && !chosen ? (
                      <span className="label-caps bg-surface-lowest/80 absolute inset-x-0 bottom-0 px-2 py-1 text-[10px]">
                        вже додано
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      {multiple ? (
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Скасувати
          </Button>
          <Button type="button" disabled={picked.size === 0} onClick={confirm}>
            Додати {picked.size > 0 ? `(${picked.size})` : ""}
          </Button>
        </div>
      ) : null}
    </>
  );
}

/**
 * One image as a form field: a thumbnail, and buttons to replace or clear it.
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

  return (
    <div className="flex flex-col gap-2">
      <span className="label-caps text-muted-foreground">{label}</span>

      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          <span className="border-bronze/20 relative block size-24 shrink-0 border">
            <Image src={mediaUrl(value)} alt="" fill sizes="96px" className="object-cover" />
          </span>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
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

      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        current={value ? [value] : []}
        onPick={([item]) => item && onChange(item.path)}
      />
    </div>
  );
}
