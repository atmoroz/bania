"use client";

import { ExternalLink, Eye, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { cn } from "@/shared/lib";
import { Button, SlotListSkeleton } from "@/shared/ui";

import {
  discardDrafts,
  getAdminBlocks,
  moveBlock,
  publishDrafts,
  stageDrafts,
  type AdminBlock,
  type AdminPage,
  type BlockDraft,
} from "../model/actions";
import { BlockEditor, type Draft } from "./block-editor";

type Drafts = Record<string, Draft>;

/** Equal ignoring key order, and treating absent and undefined as the same. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => same(item, b[i]));
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  for (const key of new Set([...Object.keys(ao), ...Object.keys(bo)])) {
    if (ao[key] === undefined && bo[key] === undefined) continue;
    if (!same(ao[key], bo[key])) return false;
  }
  return true;
}

/** The editor starts from an unpublished draft if one is waiting, else from the live block. */
function draftsFrom(blocks: AdminBlock[]): Drafts {
  return Object.fromEntries(
    blocks.map((b) => [
      b.id,
      b.draft
        ? { content: b.draft.content, isVisible: b.draft.isVisible }
        : { content: b.content, isVisible: b.isVisible },
    ]),
  );
}

export function PageEditor({ pages }: { pages: AdminPage[] }) {
  const [slug, setSlug] = useState(pages[0]?.slug ?? "");
  const [blocks, setBlocks] = useState<AdminBlock[] | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isLoading, startLoading] = useTransition();
  const [isBusy, startBusy] = useTransition();

  useEffect(() => {
    // All of it inside the transition: setting state straight from an effect
    // body is what the compiler's rule is about, and the reset belongs with
    // the load anyway — they describe one change of page.
    startLoading(async () => {
      const next = await getAdminBlocks(slug);
      setError(null);
      setSaved(false);
      setBlocks(next);
      setDrafts(draftsFrom(next));
    });
  }, [slug]);

  function reload() {
    startLoading(async () => {
      const next = await getAdminBlocks(slug);
      setBlocks(next);
      setDrafts(draftsFrom(next));
    });
  }

  /** Blocks whose draft differs from what the site is currently serving. */
  const changedIds = useMemo(() => {
    if (!blocks) return new Set<string>();
    return new Set(
      blocks
        .filter((b) => {
          const d = drafts[b.id];
          return d ? !same(d.content, b.content) || d.isVisible !== b.isVisible : false;
        })
        .map((b) => b.id),
    );
  }, [blocks, drafts]);

  const dirty = changedIds.size > 0;

  const payload = (): BlockDraft[] =>
    (blocks ?? [])
      .filter((b) => changedIds.has(b.id))
      .map((b) => ({
        id: b.id,
        type: b.type,
        content: drafts[b.id]?.content ?? b.content,
        isVisible: drafts[b.id]?.isVisible ?? b.isVisible,
      }));

  function preview() {
    startBusy(async () => {
      const result = await stageDrafts(payload());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      // The home page's slug is empty, which is not a path segment.
      window.open(`/preview/${slug || "home"}`, "_blank", "noopener");
    });
  }

  function publish() {
    startBusy(async () => {
      const result = await publishDrafts(slug, payload());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setSaved(true);
      reload();
    });
  }

  function discard() {
    startBusy(async () => {
      const result = await discardDrafts(slug);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setSaved(false);
      reload();
    });
  }

  function reorder(id: string, direction: "up" | "down") {
    startBusy(async () => {
      const result = await moveBlock(slug, id, direction);
      if (!result.ok) setError(result.message);
      reload();
    });
  }

  const current = pages.find((p) => p.slug === slug);

  return (
    <div className="mt-10">
      <nav className="border-bronze/15 -mx-5 flex gap-2 overflow-x-auto border-b px-5 pb-px md:mx-0 md:px-0">
        {pages.map((page) => (
          <button
            key={page.slug}
            type="button"
            onClick={() => setSlug(page.slug)}
            className={cn(
              "label-caps shrink-0 border-b-2 px-4 py-3 transition-colors",
              page.slug === slug
                ? "border-bronze text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {page.navLabel}
          </button>
        ))}
      </nav>

      {current ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground flex items-center gap-2 text-[15px]">
            Блоки сторінки «{current.navLabel}», у порядку показу.
            {isLoading && blocks !== null ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
          </p>
          <a
            href={slug === "" ? "/" : `/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="label-caps text-bronze inline-flex items-center gap-2"
          >
            Сторінка на сайті
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      ) : null}

      {blocks === null ? (
        <div className="mt-6">
          <SlotListSkeleton rows={4} />
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-[15px]">На цій сторінці ще немає блоків.</p>
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-3">
            {blocks.map((block, i) => (
              <BlockEditor
                key={block.id}
                block={block}
                draft={drafts[block.id] ?? { content: block.content, isVisible: block.isVisible }}
                changed={changedIds.has(block.id)}
                index={i}
                total={blocks.length}
                busy={isBusy}
                onChange={(next) => {
                  setDrafts((d) => ({ ...d, [block.id]: next }));
                  setSaved(false);
                }}
                onMove={(direction) => reorder(block.id, direction)}
              />
            ))}
          </ul>

          {/* One place to act, under the whole form. Previewing and saving are
              page-wide, so putting a button on each block would make the owner
              remember which ones they had already pressed. */}
          <div className="border-bronze/15 mt-8 border-t pt-6">
            {error ? <p className="text-destructive mb-4 text-[15px]">{error}</p> : null}

            {/* The same bar as the gallery and the catalogue: what the
                state is on the left, what to do about it on the right, with
                the one button that changes the site last. */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-muted-foreground text-[13px] leading-5">
                {saved && !dirty
                  ? "Збережено. Зміни вже на сайті."
                  : dirty
                    ? `Незбережених змін: ${changedIds.size}. На сайті вони ще не видні.`
                    : "Змін немає."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={preview}
                  disabled={!dirty || isBusy}
                  title="Відкриє сторінку зі змінами в новій вкладці. Сайт не зміниться."
                >
                  <Eye className="size-4" aria-hidden />
                  Переглянути
                </Button>

                <Button type="button" variant="ghost" onClick={discard} disabled={!dirty || isBusy}>
                  Скасувати
                </Button>

                <Button type="button" onClick={publish} disabled={!dirty || isBusy}>
                  {isBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Зберігаємо…
                    </>
                  ) : (
                    "Зберегти"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
