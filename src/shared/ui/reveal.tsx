"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/shared/lib";

/**
 * Lifts its children into place when they scroll into view.
 *
 * A scroll listener, not an IntersectionObserver. The observer reads
 * better and failed a real test: jump down a page in one movement — an
 * anchor, a restored scroll position, a flick on a phone — and a section
 * can pass through the viewport between two frames without the observer
 * ever reporting it inside. It then stays invisible for good, which is
 * the worst outcome an entrance animation can have. One rect read per
 * animation frame, on a handful of sections, costs nothing and cannot
 * miss.
 *
 * The listener removes itself the moment its section has arrived, so a
 * read page listens to nothing. The hidden state is CSS, keyed to
 * `data-js` on <html> — see globals.css for why.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Seconds to wait, for staggering a row of cards. */
  delay?: number;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    let done = false;

    const check = () => {
      frame = 0;
      if (done) return;
      // A tenth of a screen early, so the movement finishes as the
      // section settles rather than starting once it is already read.
      if (element.getBoundingClientRect().top >= window.innerHeight * 0.9) return;
      done = true;
      element.setAttribute("data-shown", "true");
      stop();
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };

    const stop = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
