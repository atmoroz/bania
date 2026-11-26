"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui";

import { SwitchField, TextField } from "./field-inputs";

type Stat = { value: string; label: string; isVisible: boolean };
type Feature = { icon: string; title: string; text: string; isVisible: boolean };

/**
 * Shared frame for the repeating lists.
 *
 * Each row can be hidden on its own, which is the thing the owner asked for
 * by name — the temperatures under the banner come and go individually
 * without the block itself being switched off.
 */
function ListFrame({
  label,
  hint,
  count,
  onAdd,
  children,
}: {
  label: string;
  hint?: string;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="label-caps text-muted-foreground">
          {label} <span className="normal-case">({count})</span>
        </p>
        {hint ? (
          <p className="text-muted-foreground/70 mt-1 text-[12px] leading-4">{hint}</p>
        ) : null}
      </div>
      {children}
      <Button type="button" variant="ghost" onClick={onAdd} className="self-start">
        Додати
      </Button>
    </div>
  );
}

function RowControls({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        aria-label="Вище"
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        className="border-bronze/25 hover:border-bronze disabled:opacity-30 border p-2 transition-colors"
      >
        <ChevronUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Нижче"
        disabled={index === total - 1}
        onClick={() => onMove(index + 1)}
        className="border-bronze/25 hover:border-bronze disabled:opacity-30 border p-2 transition-colors"
      >
        <ChevronDown className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Видалити"
        onClick={onRemove}
        className="border-bronze/25 hover:border-destructive hover:text-destructive border p-2 transition-colors"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}

export function StatsField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: Stat[];
  onChange: (next: Stat[]) => void;
}) {
  const patch = (i: number, p: Partial<Stat>) =>
    onChange(value.map((s, j) => (i === j ? { ...s, ...p } : s)));

  return (
    <ListFrame
      label={label}
      hint={hint}
      count={value.length}
      onAdd={() => onChange([...value, { value: "", label: "", isVisible: true }])}
    >
      {value.map((stat, i) => (
        <div
          key={i}
          className={cn(
            "border-bronze/15 flex flex-col gap-4 border p-4",
            !stat.isVisible && "opacity-60",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="label-caps text-bronze">#{i + 1}</p>
            <RowControls
              index={i}
              total={value.length}
              onMove={(to) => onChange(move(value, i, to))}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          </div>
          <TextField label="Значення" value={stat.value} onChange={(v) => patch(i, { value: v })} />
          <TextField label="Підпис" value={stat.label} onChange={(v) => patch(i, { label: v })} />
          <SwitchField
            label="Показувати"
            value={stat.isVisible}
            onChange={(v) => patch(i, { isVisible: v })}
          />
        </div>
      ))}
    </ListFrame>
  );
}

export function FeaturesField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: Feature[];
  onChange: (next: Feature[]) => void;
}) {
  const patch = (i: number, p: Partial<Feature>) =>
    onChange(value.map((f, j) => (i === j ? { ...f, ...p } : f)));

  return (
    <ListFrame
      label={label}
      hint={hint}
      count={value.length}
      onAdd={() => onChange([...value, { icon: "flame", title: "", text: "", isVisible: true }])}
    >
      {value.map((item, i) => (
        <div
          key={i}
          className={cn(
            "border-bronze/15 flex flex-col gap-4 border p-4",
            !item.isVisible && "opacity-60",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="label-caps text-bronze">#{i + 1}</p>
            <RowControls
              index={i}
              total={value.length}
              onMove={(to) => onChange(move(value, i, to))}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          </div>
          <TextField label="Заголовок" value={item.title} onChange={(v) => patch(i, { title: v })} />
          <TextField label="Текст" rows={3} value={item.text} onChange={(v) => patch(i, { text: v })} />
          <TextField
            label="Іконка"
            hint="Назва з набору lucide, наприклад flame, droplets, leaf."
            value={item.icon}
            onChange={(v) => patch(i, { icon: v })}
          />
          <SwitchField
            label="Показувати"
            value={item.isVisible}
            onChange={(v) => patch(i, { isVisible: v })}
          />
        </div>
      ))}
    </ListFrame>
  );
}
