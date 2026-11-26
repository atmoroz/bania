"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { cn } from "@/shared/lib";
import { SlotListSkeleton } from "@/shared/ui";

import { getAdminBlocks, type AdminBlock, type AdminPage } from "../model/actions";
import { BlockEditor } from "./block-editor";

export function PageEditor({ pages }: { pages: AdminPage[] }) {
  const [slug, setSlug] = useState(pages[0]?.slug ?? "");
  const [blocks, setBlocks] = useState<AdminBlock[] | null>(null);
  const [isLoading, startLoading] = useTransition();

  useEffect(() => {
    startLoading(async () => setBlocks(await getAdminBlocks(slug)));
  }, [slug]);

  function reload() {
    startLoading(async () => setBlocks(await getAdminBlocks(slug)));
  }

  const current = pages.find((p) => p.slug === slug);
  const href = slug === "" ? "/" : `/${slug}`;

  return (
    <div className="mt-10">
      {/* A scrolling row, not a wrapping one: the tabs stay on a single line
          on a phone, which keeps "which page am I editing" in one place. */}
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
            {!page.isVisible ? <span className="text-bronze"> · прихована</span> : null}
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
            href={href}
            target="_blank"
            rel="noreferrer"
            className="label-caps text-bronze inline-flex items-center gap-2"
          >
            Відкрити сторінку
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      ) : null}

      {/* Placeholders only before the first load. Swapping the list out on
          every refresh unmounted the editors, which threw away the open panel,
          the draft inside it and the scroll position — saving looked like the
          page had reset itself. A refresh now leaves the list standing. */}
      {blocks === null ? (
        <div className="mt-6">
          <SlotListSkeleton rows={4} />
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-[15px]">На цій сторінці ще немає блоків.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {blocks.map((block, i) => (
            <BlockEditor
              key={block.id}
              pageSlug={slug}
              block={block}
              index={i}
              total={blocks.length}
              onChanged={reload}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
