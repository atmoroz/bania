"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Eye, EyeOff, ImagePlus, Pencil, Trash2 } from "lucide-react";

import { MediaPickerDialog } from "@/features/admin-media";
// Straight from the module, not the slice barrel: the barrel also exports
// the preview reader, which reaches for next/headers and so cannot be pulled
// into a client bundle.
import { clearStaged, stageGallery } from "@/features/admin-preview/model/stage";
import { cn, useGridReorder } from "@/shared/lib";
import { Button, SaveBar } from "@/shared/ui";

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
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, startWork] = useTransition();

  const { gridRef, tileRef, handleProps, dragging, forget } = useGridReorder(
    items,
    (tile) => tile.key,
    setItems,
  );

  const dirty = !same(items, saved);

  // ---------------------------------------------------------------------
  // editing and saving
  // ---------------------------------------------------------------------

  function patch(key: string, change: Partial<Tile>) {
    setItems(items.map((t) => (t.key === key ? { ...t, ...change } : t)));
  }

  function save() {
    startWork(async () => {
      const result = await saveGallery(
        items.map((t) => ({
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
      await clearStaged("gallery");
      // Reloaded rather than assumed: the new rows have ids now, and the
      // next save has to update them instead of inserting them again.
      const fresh = toTiles(await getGalleryPhotos());
      forget();
      setSaved(fresh);
      setItems(fresh);
    });
  }

  /** Stages what is on screen and opens the real page with it. */
  function preview() {
    startWork(async () => {
      const result = await stageGallery(
        items
          .filter((t) => t.isVisible)
          .map((t) => ({
            id: t.key,
            src: t.url,
            alt: t.alt,
            title: t.title || null,
            caption: t.caption || null,
          })),
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      window.open("/preview/gallery", "_blank", "noopener");
    });
  }

  function discard() {
    setError(null);
    forget();
    setItems(saved);
    startWork(async () => clearStaged("gallery"));
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
          ref={gridRef}
          // Far smaller than the public grid, and that is the point: to drag
          // a photograph somewhere you have to see both ends of the move. At
          // the site's own size one tile filled a phone screen.
          className={cn(
            "mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
            dragging && "select-none",
          )}
        >
          {items.map((item, index) => (
            <li
              key={item.key}
              ref={tileRef(item.key)}
              className={cn(
                "flex flex-col border transition-colors",
                dragging === item.key
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
                  {...handleProps(item.key, index)}
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
                  onClick={() => setItems(items.filter((t) => t.key !== item.key))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SaveBar
        status={dirty ? "Є незбережені зміни. На сайті їх ще не видно." : "Усе збережено."}
        dirty={dirty}
        busy={busy}
        onPreview={preview}
        previewTitle="Відкриє сторінку зі змінами в новій вкладці. Сайт не зміниться."
        onDiscard={discard}
        onSave={save}
      />

      <MediaPickerDialog
        open={adding}
        onOpenChange={setAdding}
        current={used}
        multiple
        onPick={(picked) =>
          setItems([
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
            ...items,
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
