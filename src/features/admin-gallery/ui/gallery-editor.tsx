"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, ImagePlus, Trash2 } from "lucide-react";

import { MediaPickerDialog } from "@/features/admin-media";
import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui";

import {
  addGalleryPhotos,
  getGalleryPhotos,
  removeGalleryPhoto,
  reorderGallery,
  setGalleryText,
  setGalleryVisible,
  type GalleryPhoto,
  type GalleryResult,
} from "../model/actions";

/** Which tile is being dragged, and where it started. */
type Drag = { id: string; from: number };

/**
 * The venue gallery: what is shown, in what order, with what captions.
 *
 * Laid out as the same grid the public page uses, because the thing being
 * edited here is how the wall of photographs looks — a list of rows shows
 * the order but not the arrangement, and the arrangement is the point.
 *
 * Everything saves as it is done rather than behind a Save button. The page
 * editor needs one because a page is edited as a whole and previewed before
 * it goes out; a gallery is edited one tile at a time, and a Save button
 * that did not cover dragging would be worse than none.
 */
export function GalleryEditor({ initial }: { initial: GalleryPhoto[] }) {
  const [items, setItems] = useState(initial);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startWork] = useTransition();

  const grid = useRef<HTMLUListElement>(null);
  // Measured during a drag to find which tile the pointer is over.
  const tiles = useRef(new Map<string, HTMLLIElement>());

  /**
   * The order as it is right now, outside React's render cycle.
   *
   * `pointerup` has to save what is on screen, and reading the state
   * variable there reads whatever the last committed render held — which,
   * during a quick drag, is one move behind. That is not theoretical: the
   * first drag this was tried on saved the order from halfway through it.
   */
  const order = useRef(initial);

  function setOrder(next: GalleryPhoto[]) {
    order.current = next;
    setItems(next);
  }

  function run(action: () => Promise<GalleryResult>, after?: () => void) {
    startWork(async () => {
      const result = await action();
      setError(result.ok ? null : result.message);
      if (result.ok) after?.();
    });
  }

  function refresh() {
    startWork(async () => setOrder(await getGalleryPhotos()));
  }

  /** Moves one tile and returns the new order, or null if nothing moved. */
  function moved(from: number, to: number): GalleryPhoto[] | null {
    const list = order.current;
    if (to < 0 || to >= list.length || from === to) return null;
    const next = [...list];
    const [item] = next.splice(from, 1);
    if (!item) return null;
    next.splice(to, 0, item);
    return next;
  }

  function commitOrder(list: GalleryPhoto[]) {
    run(() => reorderGallery(list.map((i) => i.id)));
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>, id: string, index: number) {
    // preventScroll because focusing a tile further down would otherwise
    // jump the page mid-drag.
    event.currentTarget.focus({ preventScroll: true });
    setDrag({ id, from: index });
  }

  /**
   * While a drag is running, the whole window reports it.
   *
   * Not `setPointerCapture` on the tile: capture works until it doesn't — a
   * pointer released outside the window leaves the grid stuck mid-drag.
   * Listening on the window has neither failure mode, and the listeners
   * exist only while something is being dragged.
   */
  useEffect(() => {
    if (!drag) return;

    const onMove = (event: PointerEvent) => {
      const { clientX: x, clientY: y } = event;

      // Hit-testing both axes is what makes the grid reorder in every
      // direction: the tile under the pointer is the new position, whether
      // it is beside, above or below.
      const over = order.current.findIndex((item) => {
        const node = tiles.current.get(item.id);
        if (!node) return false;
        const box = node.getBoundingClientRect();
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      });

      const current = order.current.findIndex((i) => i.id === drag.id);
      if (over === -1 || current === -1 || over === current) return;

      const next = moved(current, over);
      if (next) setOrder(next);
    };

    const onUp = () => {
      const changed = order.current.findIndex((i) => i.id === drag.id) !== drag.from;
      setDrag(null);
      if (changed) commitOrder(order.current);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // `moved`, `setOrder` and `commitOrder` read refs and state setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!next) return;
    setOrder(next);
    commitOrder(next);
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
          className={cn(
            "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
            drag && "select-none",
          )}
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              ref={(node) => {
                if (node) tiles.current.set(item.id, node);
                else tiles.current.delete(item.id);
              }}
              className={cn(
                "flex flex-col border transition-colors",
                drag?.id === item.id ? "border-bronze opacity-60" : "border-bronze/15",
                !item.isVisible && "border-dashed",
              )}
            >
              {/* The picture is the handle: in a grid you grab the thing you
                  are moving, not a dot beside it. */}
              <button
                type="button"
                aria-label={`Перемістити «${item.title || item.path}»`}
                // preventDefault on mousedown, not on pointerdown: the
                // latter does not stop the compatibility mouse event, so
                // the browser still began selecting text as the pointer
                // swept across the grid — and the selection took the drag
                // with it.
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => onPointerDown(e, item.id, index)}
                onKeyDown={(e) => onTileKeyDown(e, index)}
                // Without touch-none a touch drag scrolls the page instead.
                className="group relative block aspect-[4/5] w-full cursor-grab touch-none active:cursor-grabbing"
              >
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
                  className={cn("object-cover", !item.isVisible && "opacity-30")}
                />

                <span className="label-caps bg-surface-lowest/80 text-bronze absolute top-0 left-0 px-2 py-1 text-[10px]">
                  {index + 1}
                </span>

                {!item.isVisible ? (
                  <span className="label-caps bg-surface-lowest/80 absolute top-0 right-0 px-2 py-1 text-[10px]">
                    Приховано
                  </span>
                ) : null}

                {/* The same caption the site draws, so the tile reads as the
                    tile it will become. */}
                {item.title || item.caption ? (
                  <span className="from-surface-lowest/95 absolute inset-x-0 bottom-0 block bg-gradient-to-t to-transparent p-4 pt-12 text-left">
                    {item.title ? (
                      <span className="font-display block text-[15px] leading-5">{item.title}</span>
                    ) : null}
                    {item.caption ? (
                      <span className="text-muted-foreground mt-1 block text-[12px]">
                        {item.caption}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>

              <div className="flex flex-col gap-3 p-4">
                <PhotoText
                  item={item}
                  // The saved values go back into the list, so the field
                  // knows what is already stored. Without that the baseline
                  // stayed at whatever the page loaded with, and typing the
                  // original text back counted as "no change" and was never
                  // saved.
                  onSave={(text) =>
                    run(() => setGalleryText(item.id, text), () =>
                      setOrder(
                        order.current.map((p) =>
                          p.id === item.id
                            ? { ...p, title: text.title.trim(), caption: text.caption.trim() }
                            : p,
                        ),
                      ),
                    )
                  }
                />

                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-4 py-2"
                    onClick={() =>
                      run(() => setGalleryVisible(item.id, !item.isVisible), () =>
                        setOrder(
                          order.current.map((p) =>
                            p.id === item.id ? { ...p, isVisible: !p.isVisible } : p,
                          ),
                        ),
                      )
                    }
                  >
                    {item.isVisible ? (
                      <Eye className="size-4" aria-hidden />
                    ) : (
                      <EyeOff className="size-4" aria-hidden />
                    )}
                    {item.isVisible ? "Показано" : "Приховано"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="px-4 py-2"
                    aria-label="Прибрати з галереї"
                    onClick={() => run(() => removeGalleryPhoto(item.id), refresh)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MediaPickerDialog
        open={adding}
        onOpenChange={setAdding}
        current={used}
        multiple
        onPick={(picked) => run(() => addGalleryPhotos(picked.map((p) => p.id)), refresh)}
      />
    </>
  );
}

/**
 * Title and caption, saved when the field is left.
 *
 * On blur rather than on every keystroke: a request per letter would be
 * absurd, and a Save button per tile would be three clicks for a word.
 */
function PhotoText({
  item,
  onSave,
}: {
  item: GalleryPhoto;
  onSave: (text: { title: string; caption: string }) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [caption, setCaption] = useState(item.caption);

  const save = () => {
    if (title === item.title && caption === item.caption) return;
    onSave({ title, caption });
  };

  const field =
    "border-foreground/20 focus:border-bronze w-full border-b bg-transparent py-1 outline-none transition-colors";

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="label-caps text-muted-foreground text-[10px]">Заголовок</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          className={cn(field, "text-[14px]")}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label-caps text-muted-foreground text-[10px]">Підпис</span>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={save}
          className={cn(field, "text-[12px]")}
        />
      </label>
    </div>
  );
}
