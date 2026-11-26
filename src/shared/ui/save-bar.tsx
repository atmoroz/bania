"use client";

import { Eye, Loader2 } from "lucide-react";

import { Button } from "./button";

/**
 * The bar under every editor in the panel.
 *
 * One component rather than four near-identical copies: pages, the
 * catalogue, the gallery and the settings all say the same three things,
 * and when the arrangement was decided for one of them it had to be decided
 * again in the other three.
 *
 * On a phone it reads top to bottom in the order the owner needs it: what
 * the state is, then the two ways to look or back out, then the one button
 * that changes the site, across the full width where a thumb lands. On a
 * wider screen it is one line, state on the left.
 */
export function SaveBar({
  status,
  dirty,
  busy,
  onPreview,
  previewTitle,
  onDiscard,
  onSave,
  savingLabel = "Зберігаємо…",
}: {
  status: string;
  dirty: boolean;
  busy: boolean;
  /** Omitted where there is nothing to preview, as in the settings. */
  onPreview?: () => void;
  previewTitle?: string;
  onDiscard: () => void;
  onSave: () => void;
  savingLabel?: string;
}) {
  return (
    <div className="border-bronze/20 mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-[13px] leading-5">{status}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          {onPreview ? (
            <Button
              type="button"
              variant="ghost"
              className="flex-1 sm:flex-none"
              disabled={busy}
              title={previewTitle}
              onClick={onPreview}
            >
              <Eye className="size-4" aria-hidden />
              Переглянути
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            className="flex-1 sm:flex-none"
            disabled={!dirty || busy}
            onClick={onDiscard}
          >
            Скасувати
          </Button>
        </div>

        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={!dirty || busy}
          onClick={onSave}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {savingLabel}
            </>
          ) : (
            "Зберегти"
          )}
        </Button>
      </div>
    </div>
  );
}
