"use client";

import { useRef } from "react";

// Straight from the modules, not the slice barrel: the barrel also
// exports the cached query, which pulls next/headers into the bundle.
import { ReviewCard } from "@/entities/review/ui/review-card";
import type { WrittenReview } from "@/entities/review/model/types";
import { ScrollFade } from "@/shared/ui";

/**
 * The reviews as a strip that admits it is one.
 *
 * Two things make a horizontal list readable as scrollable: a card
 * narrow enough that the next is always cut by the edge — two and a
 * half on a tablet, three and a half on a wide screen — and a fade over
 * the edge while there is more beyond it. With neither, the row looked
 * like a row of two that happened to end at the window.
 *
 * A client component only because the fade has to know where the strip
 * is scrolled to.
 */
export function ReviewSlider({ reviews }: { reviews: WrittenReview[] }) {
  const trackRef = useRef<HTMLUListElement>(null);

  return (
    <ScrollFade
      scrollRef={trackRef}
      axis="x"
      fadeClassName="from-surface-low"
      // Inside the container, not bleeding past it: the cards line up
      // with the heading above them and the button below.
      className="mt-14"
    >
      <ul
        ref={trackRef}
        // pt-2: a scroll container clips what leaves it, and the cards
        // rise four pixels under the pointer — without the room their top
        // border was cut off by the strip's own edge.
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pt-2 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review) => (
          <li
            key={review.id}
            // Two and a half on a tablet, three and a half on a wide
            // screen: the half is the point, it is what says "there is
            // more this way".
            className="w-[78%] shrink-0 snap-start sm:w-[52%] md:w-[44%] lg:w-[32%]"
          >
            <ReviewCard review={review} />
          </li>
        ))}
      </ul>
    </ScrollFade>
  );
}
