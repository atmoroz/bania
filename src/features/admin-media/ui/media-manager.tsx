"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { cn } from "@/shared/lib";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui";

import { deleteMedia, getMediaLibrary, updateMediaAlt, type MediaItem } from "../model/actions";
import { MediaTile, UsageList } from "./media-tile";
import { UploadButton } from "./upload-button";

/**
 * The media library.
 *
 * Two modes, the way a phone's photo album works: normally a tile opens the
 * file, and after "Обрати" a tile toggles a checkmark and a bar appears at
 * the bottom with what can be done to the selection.
 */
export function MediaManager({ initial }: { initial: MediaItem[] }) {
  const [items, setItems] = useState(initial);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [detail, setDetail] = useState<MediaItem | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startWork] = useTransition();

  const chosen = items.filter((i) => selected.has(i.id));
  const attached = chosen.filter((i) => i.uses.length > 0);

  function refresh() {
    startWork(async () => {
      const fresh = await getMediaLibrary();
      setItems(fresh);
      // A file that has gone cannot stay selected, and a detail panel cannot
      // keep showing usage counts the refresh has just changed.
      setSelected((prev) => new Set(fresh.filter((i) => prev.has(i.id)).map((i) => i.id)));
      setDetail((prev) => (prev ? (fresh.find((i) => i.id === prev.id) ?? null) : null));
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function remove(ids: string[]) {
    startWork(async () => {
      const result = await deleteMedia(ids);
      setConfirming(false);
      setDetail(null);
      // Refreshed either way: a failure here can still mean the rows are gone
      // and only the files in storage remain, and the list must show that
      // rather than the state before the attempt.
      setError(result.ok ? null : result.message);
      refresh();
    });
  }

  return (
    <>
      <div className="mt-10 flex flex-wrap items-start justify-between gap-4">
        <UploadButton onUploaded={refresh} />

        {items.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSelecting((v) => !v);
              setSelected(new Set());
            }}
          >
            {selecting ? "Готово" : "Обрати"}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-destructive mt-6 text-[15px]">{error}</p> : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-[15px]">
          У медіатеці поки порожньо. Завантажте перші фотографії.
        </p>
      ) : (
        <ul
          className={cn(
            "mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
            selecting && "pb-24",
          )}
        >
          {items.map((item) => (
            <li key={item.id}>
              <MediaTile
                item={item}
                selecting={selecting}
                selected={selected.has(item.id)}
                onClick={() => (selecting ? toggle(item.id) : setDetail(item))}
              />
            </li>
          ))}
        </ul>
      )}

      {selecting && selected.size > 0 ? (
        <div className="border-bronze/20 bg-surface-container/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-4">
            <p className="text-[15px]">Обрано: {selected.size}</p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={() => setSelected(new Set())}>
                Зняти вибір
              </Button>
              <Button type="button" disabled={busy} onClick={() => setConfirming(true)}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                Видалити
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Deleting is the one action here that cannot be undone, so it states
          what it will take with it before it does. */}
      <Dialog open={confirming} onOpenChange={(open) => !open && setConfirming(false)}>
        <DialogContent className="max-w-xl">
          <DialogTitle>Видалити {selected.size} файл(ів)?</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-3 text-[15px] leading-6">
            {attached.length === 0
              ? "Ці файли ніде не використовуються. Дію не можна скасувати."
              : "Частина файлів використовується на сайті. Видалення прибере їх і звідти — зображення зникне з цих місць. Дію не можна скасувати."}
          </DialogDescription>

          {attached.length > 0 ? (
            <ul className="border-bronze/15 mt-5 flex max-h-64 flex-col gap-4 overflow-y-auto border p-4">
              {attached.map((item) => (
                <li key={item.id}>
                  <p className="text-[13px]">{item.path}</p>
                  <div className="mt-1 pl-3">
                    <UsageList item={item} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              Скасувати
            </Button>
            <Button type="button" disabled={busy} onClick={() => remove(chosen.map((i) => i.id))}>
              {attached.length > 0 ? "Все одно видалити" : "Видалити"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MediaDetail
        item={detail}
        busy={busy}
        onClose={() => setDetail(null)}
        onSaved={refresh}
        // Through the same confirmation as a selection, so deleting one file
        // tells you what it is attached to just as deleting ten does.
        onDelete={(id) => {
          setDetail(null);
          setSelected(new Set([id]));
          setConfirming(true);
        }}
      />
    </>
  );
}

/** One file: what it looks like, what describes it, where it is used. */
function MediaDetail({
  item,
  busy,
  onClose,
  onSaved,
  onDelete,
}: {
  item: MediaItem | null;
  busy: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        {item ? <MediaDetailBody item={item} busy={busy} onSaved={onSaved} onDelete={onDelete} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MediaDetailBody({
  item,
  busy,
  onSaved,
  onDelete,
}: {
  item: MediaItem;
  busy: boolean;
  onSaved: () => void;
  onDelete: (id: string) => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const [saving, startSave] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);

  function save() {
    startSave(async () => {
      const result = await updateMediaAlt(item.id, alt.trim());
      setFailure(result.ok ? null : result.message);
      if (result.ok) onSaved();
    });
  }

  return (
    <>
      <DialogTitle className="text-[22px] break-all">{item.path}</DialogTitle>

      {/* A plain img: the dialog has no fixed height, so there is nothing for
          next/image's fill to measure against. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.alt}
        className="bg-surface-low mt-5 max-h-[40vh] w-full object-contain"
      />

      <label className="mt-6 flex flex-col gap-2">
        <span className="label-caps text-muted-foreground">Опис зображення</span>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          className="border-foreground/25 focus:border-bronze w-full border-b bg-transparent py-2 text-[15px] outline-none transition-colors"
        />
        <span className="text-muted-foreground/70 text-[12px] leading-4">
          Читають пошукові системи та програми для людей з порушеннями зору. Опишіть, що
          на фото.
        </span>
      </label>

      <div className="mt-6">
        <p className="label-caps text-muted-foreground">Де використовується</p>
        <div className="mt-2">
          <UsageList item={item} />
        </div>
      </div>

      {failure ? <p className="text-destructive mt-4 text-[15px]">{failure}</p> : null}

      <div className="mt-7 flex flex-wrap justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="size-4" aria-hidden />
          Видалити
        </Button>
        <Button type="button" disabled={saving || alt.trim() === item.alt} onClick={save}>
          {saving ? "Збереження…" : "Зберегти опис"}
        </Button>
      </div>
    </>
  );
}
