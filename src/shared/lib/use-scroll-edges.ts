"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Whether a scroll container has content hidden above or below.
 *
 * Used to fade the edges of a list, so it is obvious there is more to see
 * rather than the list appearing to simply stop at the border.
 *
 * Could be done in pure CSS with a scroll-driven animation, but support for
 * that is still uneven; a few listeners are predictable everywhere.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      setEdges({
        top: scrollTop > 4,
        // A couple of pixels of slack: fractional layout sizes mean the sum
        // rarely lands exactly on the end.
        bottom: scrollTop + clientHeight < scrollHeight - 4,
      });
    };

    // Measured after paint rather than in the effect body, because the list is
    // not laid out yet when the effect runs and every figure would read zero.
    const frame = requestAnimationFrame(update);

    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);

  return edges;
}
