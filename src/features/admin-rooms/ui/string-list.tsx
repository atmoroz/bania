"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button, TextField } from "@/shared/ui";

/** The bullet points under a card: a list of lines, in the owner's order. */
export function StringList({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <fieldset className="border-bronze/15 flex flex-col gap-4 border p-4">
      <legend className="label-caps text-muted-foreground px-2">{label}</legend>

      {value.length === 0 ? (
        <p className="text-muted-foreground/70 text-[13px]">Поки порожньо.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {value.map((line, i) => (
            <li key={i} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextField
                  label={`Пункт ${i + 1}`}
                  value={line}
                  onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Step label="Вище" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ChevronUp className="size-4" aria-hidden />
                </Step>
                <Step
                  label="Нижче"
                  disabled={i === value.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ChevronDown className="size-4" aria-hidden />
                </Step>
                <Step label="Видалити" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" aria-hidden />
                </Step>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hint ? <p className="text-muted-foreground/70 text-[12px] leading-4">{hint}</p> : null}

      <Button
        type="button"
        variant="ghost"
        className="self-start px-5 py-3"
        onClick={() => onChange([...value, ""])}
      >
        <Plus className="size-4" aria-hidden />
        Додати пункт
      </Button>
    </fieldset>
  );
}

function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="border-bronze/25 hover:border-bronze border p-2 transition-colors disabled:opacity-30"
    >
      {children}
    </button>
  );
}
