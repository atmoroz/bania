/**
 * Scroll a list so one of its children sits at the top.
 *
 * Scrolls the container rather than calling `scrollIntoView`, which would move
 * the page too and lose the visitor's place.
 *
 * Takes getters rather than elements, and retries across a few frames, because
 * neither the element nor its measurement is reliably there when the effect
 * runs. The list is only rendered once the data has loaded, and with a
 * transition the "loaded" state and the "no longer pending" state can land in
 * different commits — so at effect time the list may not exist yet, and a
 * frame later it may exist but not be laid out. Reading on each frame covers
 * both without guessing which one happened.
 */
export function scrollChildToTop(
  getList: () => HTMLElement | null,
  getChild: () => HTMLElement | null,
  { offset = 8, maxFrames = 30 }: { offset?: number; maxFrames?: number } = {},
): () => void {
  let frame = 0;
  let cancelled = false;

  const attempt = () => {
    if (cancelled) return;

    const list = getList();
    const child = getChild();

    // offsetTop of 0 means either "first item" or "not measured yet", and
    // those look identical from here. Keep looking: if it really is the first
    // item there is nothing to scroll, so retrying costs only idle frames.
    if (list && child && child.offsetTop > 0) {
      list.scrollTop = Math.max(0, child.offsetTop - offset);
      return;
    }

    if (++frame < maxFrames) requestAnimationFrame(attempt);
  };

  requestAnimationFrame(attempt);
  return () => {
    cancelled = true;
  };
}
