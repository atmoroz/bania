"use client";

import Image from "next/image";
import { Check } from "lucide-react";

import { cn } from "@/shared/lib";

import type { MediaItem } from "../model/actions";

/**
 * One file in the library.
 *
 * The usage count is on the tile rather than hidden behind a click, because
 * it is the one fact that decides whether deleting is safe, and it has to be
 * visible at the moment of choosing — not after.
 */
export function MediaTile({
  item,
  selecting,
  selected,
  onClick,
}: {
  item: MediaItem;
  selecting: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecting ? selected : undefined}
      className={cn(
        "group relative block w-full text-left transition-colors",
        "border",
        selected ? "border-bronze" : "border-bronze/15 hover:border-bronze/60",
      )}
    >
      <span className="bg-surface-low relative block aspect-square w-full overflow-hidden">
        <Image
          src={item.url}
          alt={item.alt}
          fill
          sizes="(min-width: 1024px) 200px, 40vw"
          className={cn("object-cover transition-opacity", selecting && !selected && "opacity-60")}
        />
      </span>

      {selecting ? (
        <span
          aria-hidden
          className={cn(
            "absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border",
            selected
              ? "border-bronze bg-bronze text-primary-foreground"
              : "border-foreground/50 bg-surface-lowest/70",
          )}
        >
          {selected ? <Check className="size-4" /> : null}
        </span>
      ) : null}

      <span className="block p-3">
        <span className="block truncate text-[13px]">{item.path}</span>
        <span
          className={cn(
            "mt-1 block text-[12px]",
            item.uses.length > 0 ? "text-sage" : "text-muted-foreground/70",
          )}
        >
          {item.uses.length > 0
            ? `Використовується: ${item.uses.length}`
            : "Ніде не використовується"}
        </span>
      </span>
    </button>
  );
}

/** The places a file is used, spelled out. Shown before deleting it. */
export function UsageList({ item }: { item: MediaItem }) {
  if (item.uses.length === 0) {
    return <p className="text-muted-foreground text-[13px]">Ніде не використовується.</p>;
  }

  return (
    <ul className="flex flex-col gap-1 text-[13px]">
      {item.uses.map((use, i) => (
        <li key={`${use.kind}-${use.label}-${i}`} className="text-muted-foreground">
          <span className="text-foreground">{useKindLabel[use.kind]}</span> — {use.label}
        </li>
      ))}
    </ul>
  );
}

const useKindLabel: Record<MediaItem["uses"][number]["kind"], string> = {
  room_cover: "Обкладинка локації",
  room_photo: "Фото локації",
  gallery: "Фотогалерея",
  block: "Банер сторінки",
};
