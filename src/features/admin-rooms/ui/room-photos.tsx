"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Star, X } from "lucide-react";

import { MediaPickerDialog } from "@/features/admin-media";
import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui";

import type { RoomPhoto } from "../model/actions";

/**
 * A card's photographs: which, in what order, and which is the cover.
 *
 * Arrows rather than dragging. There are three or four photographs per card,
 * the strip is one row, and a left/right button says exactly what it does —
 * dragging would be a nicer gesture for a wall of thirty, which is what the
 * gallery is.
 */
export function RoomPhotos({
  photos,
  coverMediaId,
  onChange,
  onCover,
}: {
  photos: RoomPhoto[];
  coverMediaId: string | null;
  onChange: (next: RoomPhoto[]) => void;
  onCover: (mediaId: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange(next);
  };

  function remove(mediaId: string) {
    onChange(photos.filter((p) => p.mediaId !== mediaId));
    // A cover that is no longer among the photographs would still be drawn
    // on the card, from nowhere the owner can see.
    if (coverMediaId === mediaId) onCover(null);
  }

  return (
    <fieldset className="border-bronze/15 flex flex-col gap-4 border p-4">
      <legend className="label-caps text-muted-foreground px-2">Фотографії</legend>

      {photos.length === 0 ? (
        <p className="text-muted-foreground/70 text-[13px]">
          Поки жодної. Картка показуватиме лише обкладинку.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, i) => (
            <li
              key={photo.mediaId}
              className={cn(
                "flex flex-col border",
                photo.mediaId === coverMediaId ? "border-bronze" : "border-bronze/15",
              )}
            >
              <span className="bg-surface-low relative block aspect-[4/3] w-full">
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1024px) 160px, 40vw"
                  className="object-cover"
                />
                {photo.mediaId === coverMediaId ? (
                  <span className="label-caps bg-surface-lowest/80 text-bronze absolute top-0 left-0 px-1.5 py-0.5 text-[10px]">
                    Обкладинка
                  </span>
                ) : null}
              </span>

              <span className="flex items-center justify-between gap-1 p-1">
                <Tool label="Лівіше" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ChevronLeft className="size-4" aria-hidden />
                </Tool>
                <Tool
                  label="Зробити обкладинкою"
                  disabled={photo.mediaId === coverMediaId}
                  onClick={() => onCover(photo.mediaId)}
                >
                  <Star className="size-4" aria-hidden />
                </Tool>
                <Tool
                  label="Правіше"
                  disabled={i === photos.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Tool>
                <Tool label="Прибрати" onClick={() => remove(photo.mediaId)}>
                  <X className="size-4" aria-hidden />
                </Tool>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground/70 text-[12px] leading-4">
        Перша фотографія показується на картці; якщо їх більше однієї — картка стає
        слайдером. Обкладинка — те, що видно, коли фотографій ще немає.
      </p>

      <Button
        type="button"
        variant="ghost"
        className="self-start px-5 py-3"
        onClick={() => setAdding(true)}
      >
        <ImagePlus className="size-4" aria-hidden />
        Додати з медіатеки
      </Button>

      <MediaPickerDialog
        open={adding}
        onOpenChange={setAdding}
        current={photos.map((p) => p.path)}
        multiple
        onPick={(picked) => {
          const fresh = picked
            .filter((p) => !photos.some((existing) => existing.mediaId === p.id))
            .map((p) => ({ mediaId: p.id, path: p.path, url: p.url, alt: p.alt }));
          onChange([...photos, ...fresh]);
          // The first photograph a card ever gets is also its cover, because
          // a card with photographs and no cover shows nothing at all.
          const first = fresh[0];
          if (!coverMediaId && first) onCover(first.mediaId);
        }}
      />
    </fieldset>
  );
}

function Tool({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="text-muted-foreground hover:text-bronze p-1 transition-colors disabled:opacity-25"
    >
      {children}
    </button>
  );
}
