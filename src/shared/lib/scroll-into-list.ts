/**
 * Scroll a list so one of its children sits at the top.
 *
 * Scrolls the container rather than calling `scrollIntoView`, which would move
 * the page too and lose the visitor's place.
 *
 * Takes getters and retries across frames, because nothing here is ready when
 * the effect runs: the list is only rendered once the data arrives, its height
 * is set afterwards by a ResizeObserver matching the other column, and a
 * child cannot be measured until both have happened.
 *
 * It checks that the scroll took, rather than assuming the assignment worked.
 * Setting scrollTop on a list that is not yet taller than its box is silently
 * clamped to zero, which looks exactly like success and is why this did
 * nothing on a cold load while working on every later interaction.
 */
export function scrollChildToTop(
  getList: () => HTMLElement | null,
  getChild: () => HTMLElement | null,
  { offset = 8, maxFrames = 60 }: { offset?: number; maxFrames?: number } = {},
): () => void {
  let frame = 0;
  let cancelled = false;

  const attempt = () => {
    if (cancelled) return;

    const list = getList();
    const child = getChild();
    const wanted = child ? Math.max(0, child.offsetTop - offset) : 0;

    if (list && child && wanted > 0) {
      list.scrollTop = wanted;

      // Clamped to the list's own maximum, which is the right answer when the
      // child sits near the end; anything above zero means the box is sized
      // and the scroll landed.
      if (list.scrollTop > 0) return;
    }

    if (++frame < maxFrames) requestAnimationFrame(attempt);
  };

  requestAnimationFrame(attempt);
  return () => {
    cancelled = true;
  };
}
