"use client";

import type { ReactNode, RefObject } from "react";

import { cn, useScrollEdges } from "@/shared/lib";

/**
 * Fades the edges of a scroll container when content is hidden beyond them.
 *
 * `axis` picks which pair: a vertical list fades top and bottom, a row of
 * cards fades left and right. Without it a horizontal strip simply looks
 * like a row that happens to end at the screen edge, and nobody drags it.
 *
 * A gradient in the page colour, not a drop shadow: the design builds depth
 * from tonal transitions and hairline rules and rejects elevation shadows, so
 * a blurred box-shadow would be the one soft edge on an otherwise crisp page.
 *
 * `from-background` has to match whatever the list actually sits on, which is
 * why the colour is a prop rather than assumed.
 */
export function ScrollFade({
  scrollRef,
  children,
  className,
  fadeClassName = "from-background",
  axis = "y",
}: {
  scrollRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  fadeClassName?: string;
  axis?: "x" | "y";
}) {
  const edges = useScrollEdges(scrollRef);

  return (
    <div
      className={cn(
        "relative",
        axis === "y" && "flex min-h-0 flex-1 flex-col",
        className,
      )}
    >
      {children}

      {axis === "y" ? (
        <>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b to-transparent transition-opacity duration-200",
              fadeClassName,
              edges.top ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent transition-opacity duration-200",
              fadeClassName,
              edges.bottom ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : (
        <>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r to-transparent transition-opacity duration-200",
              fadeClassName,
              edges.left ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l to-transparent transition-opacity duration-200",
              fadeClassName,
              edges.right ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      )}
    </div>
  );
}
