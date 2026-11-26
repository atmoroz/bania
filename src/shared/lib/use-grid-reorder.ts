"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** A drag in progress: what is held, where it started, and from which slot. */
type Drag = { key: string; from: number; pointerX: number; pointerY: number; slotX: number; slotY: number };

/**
 * Dragging tiles around a grid, in any direction.
 *
 * Written for the gallery and then needed again for a card's photographs,
 * which is the point at which it stops being part of a screen and becomes
 * a thing of its own. Three decisions are baked in, each of them a bug
 * that happened:
 *
 *  * Positions are read with `offsetLeft`/`offsetTop`, never
 *    `getBoundingClientRect`. The former are layout values and ignore
 *    transforms, so a tile still sliding is measured — and hit-tested —
 *    where it belongs. Measuring the animation fed its own error back in
 *    and the grid shook itself apart.
 *  * The live order lives in a ref. `pointerup` has to act on what is on
 *    screen, and the state variable there is one render behind during a
 *    quick drag.
 *  * Movement is tracked on the window, not through `setPointerCapture`:
 *    capture works until a pointer is released outside the window, and
 *    then the grid is stuck mid-drag.
 */
export function useGridReorder<T>(
  items: T[],
  keyOf: (item: T) => string,
  onChange: (next: T[]) => void,
) {
  const gridRef = useRef<HTMLUListElement>(null);
  const tiles = useRef(new Map<string, HTMLElement>());
  const order = useRef(items);
  const spots = useRef(new Map<string, { x: number; y: number }>());
  const sliding = useRef(new Map<string, Animation>());
  const pointer = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState<Drag | null>(null);

  // Declared first so the order is current before anything below measures.
  useLayoutEffect(() => {
    order.current = items;
  });

  /** Keeps the held tile under the pointer, wherever its slot moved to. */
  function follow(held: HTMLElement, at: Drag) {
    const dx = pointer.current.x - at.pointerX - (held.offsetLeft - at.slotX);
    const dy = pointer.current.y - at.pointerY - (held.offsetTop - at.slotY);
    held.style.setProperty("transform", `translate(${dx}px, ${dy}px) scale(1.04)`);
  }

  // The slide: every tile that moved animates from where it was.
  useLayoutEffect(() => {
    for (const [key, node] of tiles.current) {
      const now = { x: node.offsetLeft, y: node.offsetTop };
      const before = spots.current.get(key);
      spots.current.set(key, now);

      if (!before || key === drag?.key) continue;

      const dx = before.x - now.x;
      const dy = before.y - now.y;
      if (dx === 0 && dy === 0) continue;

      // One slide at a time per tile; overlapping animations judder.
      sliding.current.get(key)?.cancel();
      sliding.current.set(
        key,
        node.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
          { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        ),
      );
    }

    // The held tile's own slot has just moved under it. Re-placing it in
    // the same frame is the difference between gliding and twitching.
    const held = drag ? tiles.current.get(drag.key) : undefined;
    if (drag && held) follow(held, drag);
  }, [items, drag]);

  // Declared as a ref'd closure so the listener effect does not have to
  // list it: it reads only refs and the two callbacks it was given.
  function moved(from: number, to: number): T[] | null {
    const list = order.current;
    if (to < 0 || to >= list.length || from === to) return null;
    const next = [...list];
    const [item] = next.splice(from, 1);
    if (item === undefined) return null;
    next.splice(to, 0, item);
    return next;
  }

  useEffect(() => {
    if (!drag) return;
    const held = tiles.current.get(drag.key);

    const onMove = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      const grid = gridRef.current;
      if (!grid) return;

      // The pointer, in the layout space the tiles report. They share an
      // offset parent with the grid, so one translation covers both.
      const box = grid.getBoundingClientRect();
      const px = event.clientX - box.left + grid.offsetLeft;
      const py = event.clientY - box.top + grid.offsetTop;

      const over = order.current.findIndex((item) => {
        if (keyOf(item) === drag.key) return false;
        const node = tiles.current.get(keyOf(item));
        if (!node) return false;
        return (
          px >= node.offsetLeft &&
          px <= node.offsetLeft + node.offsetWidth &&
          py >= node.offsetTop &&
          py <= node.offsetTop + node.offsetHeight
        );
      });

      const current = order.current.findIndex((item) => keyOf(item) === drag.key);
      if (over !== -1 && current !== -1) {
        const next = moved(current, over);
        if (next) onChange(next);
      }

      if (held) follow(held, drag);
    };

    const onUp = () => {
      held?.style.removeProperty("transform");
      setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // `moved` and `follow` close over refs and the two props above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, keyOf, onChange]);

  /** How many tiles are on a row right now, straight from the layout. */
  function columns(): number {
    const node = gridRef.current;
    if (!node) return 1;
    return getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length;
  }

  return {
    /** Put on the grid element. */
    gridRef,
    /** Put on each tile. */
    tileRef: (key: string) => (node: HTMLElement | null) => {
      if (node) tiles.current.set(key, node);
      else tiles.current.delete(key);
    },
    /** Spread onto whatever is grabbed — the picture itself, as a rule. */
    handleProps: (key: string, index: number) => ({
      // preventDefault on mousedown, not pointerdown: the latter does not
      // stop the compatibility mouse event, so the browser still begins
      // selecting text as the pointer sweeps the grid — and the selection
      // takes the drag with it.
      onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        const node = tiles.current.get(key);
        pointer.current = { x: event.clientX, y: event.clientY };
        // preventScroll: focusing a tile further down would jump the page
        // in the middle of a drag.
        event.currentTarget.focus({ preventScroll: true });
        setDrag({
          key,
          from: index,
          pointerX: event.clientX,
          pointerY: event.clientY,
          slotX: node?.offsetLeft ?? 0,
          slotY: node?.offsetTop ?? 0,
        });
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        const step =
          event.key === "ArrowLeft"
            ? -1
            : event.key === "ArrowRight"
              ? 1
              : event.key === "ArrowUp"
                ? -columns()
                : event.key === "ArrowDown"
                  ? columns()
                  : null;
        if (step === null) return;
        event.preventDefault();
        const next = moved(index, index + step);
        if (next) onChange(next);
      },
    }),
    /** The key being dragged, for styling the tile that is in the air. */
    dragging: drag?.key ?? null,
    /** Called when the list is replaced wholesale, so nothing animates from nowhere. */
    forget: () => spots.current.clear(),
  };
}
