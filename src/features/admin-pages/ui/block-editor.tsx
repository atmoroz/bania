"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { MediaPicker } from "@/features/admin-media";
import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui";

import type { AdminBlock } from "../model/actions";
import { blockFields, blockTypeLabel } from "../model/fields";
import { CtaField, SelectField, SwitchField, TextField } from "./field-inputs";
import { FeaturesField, StatsField } from "./list-fields";

export type Draft = { content: Record<string, unknown>; isVisible: boolean };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown) => v === true;

/**
 * One block's fields.
 *
 * It owns no draft and saves nothing. The page keeps every block's edits, so
 * that one Save and one Preview cover the whole page rather than leaving the
 * owner to remember which blocks they had already pressed.
 */
export function BlockEditor({
  block,
  draft,
  changed,
  index,
  total,
  busy,
  onChange,
  onMove,
}: {
  block: AdminBlock;
  draft: Draft;
  changed: boolean;
  index: number;
  total: number;
  busy: boolean;
  onChange: (next: Draft) => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(false);
  const { content, isVisible } = draft;

  const set = (name: string, value: unknown) =>
    onChange({ ...draft, content: { ...content, [name]: value } });

  return (
    <li
      className={cn(
        "border",
        changed ? "border-bronze" : "border-bronze/15",
        !isVisible && "bg-surface-low/50 border-dashed",
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
            <span className="text-muted-foreground truncate text-[13px]">{str(content.title)}</span>
          ) : null}
          {!isVisible ? <span className="label-caps text-bronze">Приховано</span> : null}
          {changed ? <span className="label-caps text-bronze">Змінено</span> : null}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Вище"
            disabled={index === 0 || busy}
            onClick={() => onMove("up")}
            className="border-bronze/25 hover:border-bronze disabled:opacity-30 border p-2 transition-colors"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Нижче"
            disabled={index === total - 1 || busy}
            onClick={() => onMove("down")}
            className="border-bronze/25 hover:border-bronze disabled:opacity-30 border p-2 transition-colors"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange({ ...draft, isVisible: !isVisible })}
          >
            {isVisible ? "Приховати" : "Показати"}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-bronze/10 flex flex-col gap-6 border-t p-5">
          {blockFields[block.type].map((field) => {
            switch (field.kind) {
              case "text":
              case "textarea":
                return (
                  <TextField
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    rows={field.kind === "textarea" ? (field.rows ?? 3) : undefined}
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
              case "image":
                return (
                  <MediaPicker
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    value={str(content[field.name]) || undefined}
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
        </div>
      ) : null}
    </li>
  );
}
