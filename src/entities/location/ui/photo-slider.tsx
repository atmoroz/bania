"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib";

import type { LocationPhoto } from "../model/types";

/**
 * A card's photographs, one at a time.
 *
 * A scroll-snapping strip rather than a carousel that moves slides itself:
 * the browser already does momentum, snapping and swiping on a phone better
 * than any of it can be reimplemented, and with the strip the photographs are
 * all really there — a visitor who scrolls with a trackpad gets the same
 * behaviour as one who taps an arrow.
 *
 * The arrows exist because a mouse has no swipe, and the dots because without
 * them nothing says there is more than one picture.
 */
export function PhotoSlider({ photos, alt }: { photos: LocationPhoto[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  const go = (to: number) => {
    const node = track.current;
    if (!node) return;
    const index = Math.max(0, Math.min(photos.length - 1, to));
    node.scrollTo({ left: index * node.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="group/slider relative aspect-[4/3] w-full overflow-hidden">
      <div
        ref={track}
        // The index is read back from the scroll position rather than being
        // the thing that drives it, so a swipe and an arrow agree.
        onScroll={(e) => {
          const node = e.currentTarget;
          setAt(Math.round(node.scrollLeft / Math.max(1, node.clientWidth)));
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <div key={photo.src} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={photo.src}
              alt={photo.alt || alt}
              fill
              sizes="(min-width: 1024px) 400px, 100vw"
              // The first photograph is what the card shows at rest; the rest
              // can wait until somebody looks for them.
              loading={i === 0 ? undefined : "lazy"}
              className="object-cover"
            />
            {photo.caption ? (
              <p className="from-surface-lowest/90 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-4 pt-10 text-[13px]">
                {photo.caption}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <Arrow side="left" disabled={at === 0} onClick={() => go(at - 1)} />
      <Arrow side="right" disabled={at === photos.length - 1} onClick={() => go(at + 1)} />

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {photos.map((photo, i) => (
          <span
            key={photo.src}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              i === at ? "bg-bronze w-4" : "bg-foreground/40 w-1.5",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Arrow({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Попереднє фото" : "Наступне фото"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "bg-surface-lowest/70 text-foreground hover:bg-surface-lowest absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-200",
        // Out of the way until wanted, but always there on a touch screen,
        // where there is no hover to reveal them with.
        "opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
        "disabled:pointer-events-none disabled:opacity-0",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
