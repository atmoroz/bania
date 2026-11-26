"use client";

import type { ReactNode, RefObject } from "react";

import { cn, useScrollEdges } from "@/shared/lib";

/**
 * Fades the top and bottom of a scroll container when content is hidden there.
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
}: {
  scrollRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  fadeClassName?: string;
}) {
  const edges = useScrollEdges(scrollRef);

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      {children}

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
    </div>
  );
}
