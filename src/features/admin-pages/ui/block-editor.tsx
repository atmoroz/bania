"use client";

import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui";

import { moveBlock, saveBlockContent, setBlockVisible, type AdminBlock } from "../model/actions";
import { blockFields, blockTypeLabel } from "../model/fields";
import { CtaField, SelectField, SwitchField, TextField } from "./field-inputs";
import { FeaturesField, StatsField } from "./list-fields";

type Content = Record<string, unknown>;

/**
 * Equal ignoring key order.
 *
 * JSON.stringify would have done, except that it is order-sensitive and the
 * two sides come back from zod in schema order while the draft keeps the
 * order it was edited in. That mismatch left the Save button lit after a
 * successful save, which reads as "your change did not take".
 */
function sameContent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => sameContent(item, b[i]));
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  // undefined and absent mean the same thing here: the key is not stored.
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const key of keys) {
    if (ao[key] === undefined && bo[key] === undefined) continue;
    if (!sameContent(ao[key], bo[key])) return false;
  }
  return true;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown) => v === true;

export function BlockEditor({
  pageSlug,
  block,
  index,
  total,
  onChanged,
}: {
  pageSlug: string;
  block: AdminBlock;
  index: number;
  total: number;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<Content>(block.content);
  // What the database holds. Kept beside the draft so "is there anything to
  // save" is a comparison between two values from the same source, rather
  // than between the draft and a prop the server has since normalised.
  const [baseline, setBaseline] = useState<Content>(block.content);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isBusy, startBusy] = useTransition();

  const dirty = !sameContent(content, baseline);

  const set = (name: string, value: unknown) => {
    setContent((c) => ({ ...c, [name]: value }));
    setSaved(false);
    setError(null);
  };

  function save() {
    startBusy(async () => {
      const result = await saveBlockContent(block.id, block.type, content);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // No reload. The action handed back exactly what was stored, so the
      // editor is already in step; re-fetching would only risk disturbing the
      // panel the owner is working in.
      setError(null);
      setContent(result.content);
      setBaseline(result.content);
      setSaved(true);
    });
  }

  function toggleVisible() {
    startBusy(async () => {
      const result = await setBlockVisible(block.id, !block.isVisible);
      if (!result.ok) setError(result.message);
      onChanged();
    });
  }

  function reorder(direction: "up" | "down") {
    startBusy(async () => {
      const result = await moveBlock(pageSlug, block.id, direction);
      if (!result.ok) setError(result.message);
      onChanged();
    });
  }

  return (
    <li
      className={cn(
        "border-bronze/15 border",
        !block.isVisible && "bg-surface-low/50 border-dashed",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-expanded={open}
        >
          {open ? (
            <ChevronUp className="text-bronze size-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="text-bronze size-4 shrink-0" aria-hidden />
          )}
          <span className="text-[15px]">{blockTypeLabel[block.type]}</span>
          {str(content.title) ? (
            <span className="text-muted-foreground truncate text-[13px]">
              {str(content.title)}
            </span>
          ) : null}
          {!block.isVisible ? <span className="label-caps text-bronze">Приховано</span> : null}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Вище"
            disabled={index === 0 || isBusy}
            onClick={() => reorder("up")}
            className="border-bronze/25 hover:border-bronze disabled:opacity-30 border p-2 transition-colors"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Нижче"
            disabled={index === total - 1 || isBusy}
            onClick={() => reorder("down")}
            className="border-bronze/25 hover:border-bronze disabled:opacity-30 border p-2 transition-colors"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
          <Button type="button" variant="ghost" disabled={isBusy} onClick={toggleVisible}>
            {block.isVisible ? "Приховати" : "Показати"}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-bronze/10 flex flex-col gap-6 border-t p-5">
          {blockFields[block.type].map((field) => {
            switch (field.kind) {
              case "text":
                return (
                  <TextField
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    value={str(content[field.name])}
                    onChange={(v) => set(field.name, v || undefined)}
                  />
                );
              case "textarea":
                return (
                  <TextField
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    rows={field.rows ?? 3}
                    value={str(content[field.name])}
                    onChange={(v) => set(field.name, v || undefined)}
                  />
                );
              case "switch":
                return (
                  <SwitchField
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    value={bool(content[field.name])}
                    onChange={(v) => set(field.name, v)}
                  />
                );
              case "select":
                return (
                  <SelectField
                    key={field.name}
                    label={field.label}
                    options={field.options}
                    value={str(content[field.name]) || (field.options[0]?.value ?? "")}
                    onChange={(v) => set(field.name, v)}
                  />
                );
              case "cta":
                return (
                  <CtaField
                    key={field.name}
                    label={field.label}
                    value={content[field.name] as { label: string; href: string } | undefined}
                    onChange={(v) => set(field.name, v)}
                  />
                );
              case "stats":
                return (
                  <StatsField
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    value={(content[field.name] ?? []) as Parameters<typeof StatsField>[0]["value"]}
                    onChange={(v) => set(field.name, v)}
                  />
                );
              case "features":
                return (
                  <FeaturesField
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    value={
                      (content[field.name] ?? []) as Parameters<typeof FeaturesField>[0]["value"]
                    }
                    onChange={(v) => set(field.name, v)}
                  />
                );
            }
          })}

          {error ? <p className="text-destructive text-[14px] leading-snug">{error}</p> : null}

          <div className="flex items-center gap-4">
            <Button type="button" onClick={save} disabled={!dirty || isBusy}>
              {isBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Зберігаємо…
                </>
              ) : (
                "Зберегти"
              )}
            </Button>
            {saved && !dirty ? (
              <span className="text-sage text-[14px]">Збережено</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
