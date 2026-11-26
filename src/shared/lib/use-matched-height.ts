"use client";

import { useEffect, type RefObject } from "react";

/**
 * Make one element exactly as tall as another, on wide screens only.
 *
 * Used so the sessions column ends level with the calendar column. CSS cannot
 * do this on its own: a grid row takes the height of its tallest item, so the
 * long list would stretch the row and the calendar would trail below it rather
 * than the other way round.
 *
 * A guessed pixel height was the alternative and it is wrong twice a year —
 * a month spanning six weeks is a row taller than one spanning five.
 */
export function useMatchedHeight(
  source: RefObject<HTMLElement | null>,
  target: RefObject<HTMLElement | null>,
  minWidth = 1024,
) {
  useEffect(() => {
    const from = source.current;
    // Captured for cleanup: by the time it runs the ref may already point
    // somewhere else, and we want to undo what we did to this node.
    const toAtMount = target.current;
    if (!from) return;

    const media = window.matchMedia(`(min-width: ${minWidth}px)`);

    // setProperty rather than assigning to style.height: the compiler's
    // immutability rule rejects the assignment, and this says the same thing.
    const apply = () => {
      const to = target.current;
      if (!to) return;
      if (!media.matches) {
        to.style.removeProperty("height");
        return;
      }
      to.style.setProperty("height", `${from.offsetHeight}px`);
    };

    const observer = new ResizeObserver(apply);
    observer.observe(from);
    media.addEventListener("change", apply);
    apply();

    return () => {
      observer.disconnect();
      media.removeEventListener("change", apply);
      toAtMount?.style.removeProperty("height");
    };
  }, [source, target, minWidth]);
}
