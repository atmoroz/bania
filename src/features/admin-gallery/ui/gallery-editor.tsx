"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, ImagePlus, Loader2, Pencil, Trash2 } from "lucide-react";

import { MediaPickerDialog } from "@/features/admin-media";
import { cn } from "@/shared/lib";
import { Button, ButtonLink } from "@/shared/ui";

import {
  getGalleryPhotos,
  saveGallery,
  type GalleryPhoto,
} from "../model/actions";

/** A tile being edited. `id` is null until it has been saved once. */
type Tile = {
  key: string;
  id: string | null;
  mediaId: string;
  path: string;
  url: string;
  alt: string;
  title: string;
  caption: string;
  isVisible: boolean;
};

/**
 * A drag in progress.
 *
 * `pointerX/Y` and `slotX/Y` are where it began: the tile is kept under the
 * pointer by arithmetic on those, rather than by measuring it every frame.
 * Measuring would read whatever the slide animation is doing at that
 * instant, which is exactly the feedback loop that made the grid shudder.
 */
type Drag = {
  key: string;
  pointerX: number;
  pointerY: number;
  slotX: number;
  slotY: number;
};

const toTiles = (photos: GalleryPhoto[]): Tile[] =>
  photos.map((p) => ({ ...p, key: p.id, id: p.id }));

/** Order, captions and visibility, compared without caring about key order. */
const same = (a: Tile[], b: Tile[]) =>
  a.length === b.length &&
  a.every((tile, i) => {
    const other = b[i];
    return (
      other !== undefined &&
      tile.key === other.key &&
      tile.title === other.title &&
      tile.caption === other.caption &&
      tile.isVisible === other.isVisible
    );
  });

/**
 * The venue gallery: what is shown, in what order, with what captions.
 *
 * Laid out as the same grid the public page uses, only smaller, because what
 * is being edited is how a wall of photographs looks — and to drag one
 * somewhere you have to see both where it is and where it is going.
 *
 * Nothing is written until Save, like the page editor. The first version
 * saved every action as it happened, which was a request per caption, per
 * hidden tile and per drag, and left the panel with two different rules for
 * what a change costs.
 */
export function GalleryEditor({ initial }: { initial: GalleryPhoto[] }) {
  const [saved, setSaved] = useState(() => toTiles(initial));
  const [items, setItems] = useState(saved);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, startWork] = useTransition();

  const grid = useRef<HTMLUListElement>(null);
  // Measured during a drag to find which tile the pointer is over, and after
  // every render to animate the ones that moved.
  const tiles = useRef(new Map<string, HTMLLIElement>());

  /**
   * The order as it is right now, outside React's render cycle.
   *
   * `pointerup` has to act on what is on screen, and reading the state
   * variable there reads whatever the last committed render held — which,
   * during a quick drag, is one move behind.
   */
  const order = useRef(items);

  function setOrder(next: Tile[]) {
    order.current = next;
    setItems(next);
  }

  const dirty = !same(items, saved);

  // ---------------------------------------------------------------------
  // the slide: tiles animate from where they were to where they now are
  // ---------------------------------------------------------------------

  const spots = useRef(new Map<string, { x: number; y: number }>());
  const sliding = useRef(new Map<string, Animation>());
  /** Where the pointer was last seen, so the held tile can be re-placed
   *  the moment its slot moves rather than on the next pointer event. */
  const pointer = useRef({ x: 0, y: 0 });

  /** Keeps the dragged tile under the pointer, wherever its slot moved to. */
  function follow(held: HTMLElement, at: Drag) {
    // Pure arithmetic on layout positions: how far the pointer has
    // travelled, less how far the tile's own slot has travelled under it.
    const dx = pointer.current.x - at.pointerX - (held.offsetLeft - at.slotX);
    const dy = pointer.current.y - at.pointerY - (held.offsetTop - at.slotY);
    held.style.setProperty("transform", `translate(${dx}px, ${dy}px) scale(1.04)`);
  }

  useLayoutEffect(() => {
    for (const [key, node] of tiles.current) {
      // offsetLeft/offsetTop, not getBoundingClientRect: these are layout
      // positions and ignore transforms, so a tile that is still sliding
      // reports where it belongs rather than where it happens to be. The
      // first version measured mid-flight and fed the error back in, and
      // the grid shook itself apart.
      const now = { x: node.offsetLeft, y: node.offsetTop };
      const before = spots.current.get(key);
      spots.current.set(key, now);

      // The dragged tile is already following the pointer; animating it to
      // its slot as well would fight that.
      if (!before || key === drag?.key) continue;

      const dx = before.x - now.x;
      const dy = before.y - now.y;
      if (dx === 0 && dy === 0) continue;

      // One slide at a time per tile. Overlapping animations on the same
      // element is the other half of the shudder.
      sliding.current.get(key)?.cancel();
      sliding.current.set(
        key,
        node.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
          { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        ),
      );
    }

    // The held tile's own slot has just moved under it. Re-placing it here,
    // in the same frame, is the difference between gliding and twitching.
    const held = drag ? tiles.current.get(drag.key) : undefined;
    if (drag && held) follow(held, drag);
  }, [items, drag]);

  // ---------------------------------------------------------------------
  // dragging
  // ---------------------------------------------------------------------

  /** Moves one tile and returns the new order, or null if nothing moved. */
  function moved(from: number, to: number): Tile[] | null {
    const list = order.current;
    if (to < 0 || to >= list.length || from === to) return null;
    const next = [...list];
    const [item] = next.splice(from, 1);
    if (!item) return null;
    next.splice(to, 0, item);
    return next;
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>, key: string) {
    const node = tiles.current.get(key);
    // preventScroll because focusing a tile further down would otherwise
    // jump the page mid-drag.
    event.currentTarget.focus({ preventScroll: true });
    setDrag({
      key,
      pointerX: event.clientX,
      pointerY: event.clientY,
      slotX: node?.offsetLeft ?? 0,
      slotY: node?.offsetTop ?? 0,
    });
  }

  /**
   * While a drag is running, the whole window reports it.
   *
   * Not `setPointerCapture` on the tile: capture works until it doesn't — a
   * pointer released outside the window leaves the grid stuck mid-drag.
   */
  useEffect(() => {
    if (!drag) return;

    const held = tiles.current.get(drag.key);

    const onMove = (event: PointerEvent) => {
      const { clientX: x, clientY: y } = event;
      pointer.current = { x, y };
      const grid_ = grid.current;
      if (!grid_) return;

      // The pointer, in the same layout space the tiles report. Tiles and
      // the grid share an offset parent, so one translation covers both --
      // and nothing here reads a transform, so a tile in mid-slide is still
      // hit-tested where it belongs. Testing against the animated rectangle
      // made tiles swap back and forth under a still pointer.
      const box = grid_.getBoundingClientRect();
      const px = x - box.left + grid_.offsetLeft;
      const py = y - box.top + grid_.offsetTop;

      const over = order.current.findIndex((item) => {
        if (item.key === drag.key) return false;
        const node = tiles.current.get(item.key);
        if (!node) return false;
        return (
          px >= node.offsetLeft &&
          px <= node.offsetLeft + node.offsetWidth &&
          py >= node.offsetTop &&
          py <= node.offsetTop + node.offsetHeight
        );
      });

      const current = order.current.findIndex((i) => i.key === drag.key);
      if (over !== -1 && current !== -1) {
        const next = moved(current, over);
        if (next) setOrder(next);
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
  }, [drag]);

  /** How many tiles are on a row right now, straight from the layout. */
  function columns(): number {
    const node = grid.current;
    if (!node) return 1;
    return getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length;
  }

  /** Keyboard equivalent of dragging: a grid needs all four arrows. */
  function onTileKeyDown(event: React.KeyboardEvent, index: number) {
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
    if (next) setOrder(next);
  }

  // ---------------------------------------------------------------------
  // editing and saving
  // ---------------------------------------------------------------------

  function patch(key: string, change: Partial<Tile>) {
    setOrder(order.current.map((t) => (t.key === key ? { ...t, ...change } : t)));
  }

  function save() {
    startWork(async () => {
      const result = await saveGallery(
        order.current.map((t) => ({
          id: t.id,
          mediaId: t.mediaId,
          title: t.title,
          caption: t.caption,
          isVisible: t.isVisible,
        })),
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setError(null);
      // Reloaded rather than assumed: the new rows have ids now, and the
      // next save has to update them instead of inserting them again.
      const fresh = toTiles(await getGalleryPhotos());
      spots.current.clear();
      setSaved(fresh);
      setOrder(fresh);
    });
  }

  function discard() {
    setError(null);
    spots.current.clear();
    setOrder(saved);
  }

  const used = items.map((i) => i.path);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <Button type="button" onClick={() => setAdding(true)}>
          <ImagePlus className="size-4" aria-hidden />
          Додати з медіатеки
        </Button>
        <p className="text-muted-foreground text-[13px]">
          Перетягніть фото на будь-яке місце. Нові додаються на початок.
        </p>
      </div>

      {error ? <p className="text-destructive mt-6 text-[15px]">{error}</p> : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-[15px]">
          У галереї поки немає фотографій.
        </p>
      ) : (
        <ul
          ref={grid}
          // Far smaller than the public grid, and that is the point: to drag
          // a photograph somewhere you have to see both ends of the move. At
          // the site's own size one tile filled a phone screen.
          className={cn(
            "mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
            drag && "select-none",
          )}
        >
          {items.map((item, index) => (
            <li
              key={item.key}
              ref={(node) => {
                if (node) tiles.current.set(item.key, node);
                else tiles.current.delete(item.key);
              }}
              className={cn(
                "flex flex-col border transition-colors",
                drag?.key === item.key
                  ? "border-bronze relative z-10 cursor-grabbing"
                  : "border-bronze/15",
                !item.isVisible && "border-dashed",
                item.id === null && "border-sage",
              )}
            >
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
                  className={cn("object-cover", !item.isVisible && "opacity-30")}
                />

                {/* The picture is the handle: in a grid you grab the thing
                    you are moving. It sits under the caption fields, so the
                    only part of the tile that does not start a drag is the
                    text somebody might be trying to edit. */}
                <button
                  type="button"
                  aria-label={`Перемістити «${item.title || item.path}»`}
                  // preventDefault on mousedown, not on pointerdown: the
                  // latter does not stop the compatibility mouse event, so
                  // the browser still began selecting text as the pointer
                  // swept across the grid — and the selection took the drag
                  // with it.
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => onPointerDown(e, item.key)}
                  onKeyDown={(e) => onTileKeyDown(e, index)}
                  // Without touch-none a touch drag scrolls the page instead.
                  className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
                />

                <span className="label-caps bg-surface-lowest/80 text-bronze pointer-events-none absolute top-0 left-0 px-1.5 py-0.5 text-[10px]">
                  {index + 1}
                </span>

                {item.id === null ? (
                  <span className="label-caps bg-surface-lowest/80 text-sage pointer-events-none absolute top-0 right-0 px-1.5 py-0.5 text-[10px]">
                    Нове
                  </span>
                ) : !item.isVisible ? (
                  <span className="label-caps bg-surface-lowest/80 pointer-events-none absolute top-0 right-0 px-1.5 py-0.5 text-[10px]">
                    Приховано
                  </span>
                ) : null}

                <PhotoText
                  title={item.title}
                  caption={item.caption}
                  onChange={(change) => patch(item.key, change)}
                />
              </div>

              <div className="flex items-center justify-between gap-2 p-2">
                <IconButton
                  label={item.isVisible ? "Приховати з сайту" : "Показати на сайті"}
                  onClick={() => patch(item.key, { isVisible: !item.isVisible })}
                >
                  {item.isVisible ? (
                    <Eye className="size-4" aria-hidden />
                  ) : (
                    <EyeOff className="size-4" aria-hidden />
                  )}
                </IconButton>

                <IconButton
                  label="Прибрати з галереї"
                  onClick={() => setOrder(order.current.filter((t) => t.key !== item.key))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* One bar for the whole gallery, as on the pages tab: until Save is
          pressed the site has not changed, and that is said rather than
          implied. */}
      <div className="border-bronze/20 mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <p className="text-muted-foreground text-[13px]">
          {dirty
            ? "Є незбережені зміни. На сайті їх ще не видно."
            : "Усе збережено."}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/gallery" variant="ghost">
            Сторінка на сайті
          </ButtonLink>
          <Button type="button" variant="ghost" disabled={!dirty || busy} onClick={discard}>
            Скасувати
          </Button>
          <Button type="button" disabled={!dirty || busy} onClick={save}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Зберегти
          </Button>
        </div>
      </div>

      <MediaPickerDialog
        open={adding}
        onOpenChange={setAdding}
        current={used}
        multiple
        onPick={(picked) =>
          setOrder([
            ...picked.map((p) => ({
              // No database id yet; the key only has to be unique on screen.
              key: `new-${p.id}`,
              id: null,
              mediaId: p.id,
              path: p.path,
              url: p.url,
              alt: p.alt,
              title: "",
              caption: "",
              isVisible: true,
            })),
            ...order.current,
          ])
        }
      />
    </>
  );
}

/**
 * Title and caption, edited where they are shown.
 *
 * On the photograph rather than in a panel below it, so the tile stays small
 * enough to drag and what is typed is seen against the picture it belongs to.
 *
 * The hard part is making it obvious the text can be changed at all, since it
 * is styled to look like the site. Three things say so without adding chrome:
 * a dotted rule under each line, solid bronze on hover and focus; a pencil
 * that appears on hover; and placeholders, so an empty tile shows the words
 * rather than nothing.
 */
function PhotoText({
  title,
  caption,
  onChange,
}: {
  title: string;
  caption: string;
  onChange: (change: { title?: string; caption?: string }) => void;
}) {
  const field =
    "w-full border-b border-dashed border-foreground/30 bg-transparent outline-none " +
    "transition-colors placeholder:text-foreground/40 " +
    "hover:border-bronze hover:border-solid focus:border-bronze focus:border-solid " +
    "focus:bg-surface-lowest/60";

  return (
    <div className="group/text from-surface-lowest/95 absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t to-transparent p-2 pt-10">
      <div className="flex items-end gap-1">
        <input
          value={title}
          placeholder="Заголовок"
          aria-label="Заголовок фото"
          onChange={(e) => onChange({ title: e.target.value })}
          className={cn(field, "font-display text-[13px] leading-5")}
        />
        <Pencil
          className="text-bronze mb-1 size-3 shrink-0 opacity-0 transition-opacity group-hover/text:opacity-100"
          aria-hidden
        />
      </div>
      <input
        value={caption}
        placeholder="Підпис"
        aria-label="Підпис фото"
        onChange={(e) => onChange({ caption: e.target.value })}
        className={cn(field, "text-muted-foreground text-[11px] leading-4")}
      />
    </div>
  );
}

/** A square button for one icon, small enough to sit under a small tile. */
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="border-bronze/30 text-foreground hover:border-bronze hover:bg-bronze/12 border p-2 transition-colors"
    >
      {children}
    </button>
  );
}
