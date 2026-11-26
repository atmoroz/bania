"use client";

import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/shared/lib";

const labelClass = "label-caps text-muted-foreground";
const inputClass =
  "border-foreground/25 focus:border-bronze w-full border-b bg-transparent py-2 text-[15px] outline-none transition-colors";

export function TextField({
  label,
  hint,
  value,
  onChange,
  rows,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "resize-y leading-6")}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
      {hint ? <span className="text-muted-foreground/70 text-[12px] leading-4">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "bg-surface-low")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * A switch, drawn as a labelled control rather than a bare checkbox.
 *
 * `button` with `aria-pressed` rather than an `input`: the state is "on or
 * off right now", which is what aria-pressed means, and it avoids a checkbox
 * that would look nothing like the rest of the panel.
 */
export function SwitchField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <p className="text-[15px]">{label}</p>
        {hint ? (
          <p className="text-muted-foreground/70 mt-1 text-[12px] leading-4">{hint}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={cn(
          "label-caps flex shrink-0 items-center gap-2 border px-3 py-2 transition-colors",
          value
            ? "border-bronze bg-sage-deep/40 text-foreground"
            : "border-bronze/25 text-muted-foreground hover:border-bronze/60",
        )}
      >
        {value ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
        {value ? "Увімкнено" : "Вимкнено"}
      </button>
    </div>
  );
}

export function CtaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { label: string; href: string } | undefined;
  onChange: (next: { label: string; href: string } | undefined) => void;
}) {
  const current = value ?? { label: "", href: "" };

  // Both fields empty means "no button", not "a button with no text": the
  // schema makes the whole object optional, so clearing it has to remove it.
  const update = (next: { label: string; href: string }) =>
    onChange(next.label.trim() === "" && next.href.trim() === "" ? undefined : next);

  return (
    <fieldset className="border-bronze/15 flex flex-col gap-4 border p-4">
      <legend className={cn(labelClass, "px-2")}>{label}</legend>
      <TextField
        label="Напис"
        value={current.label}
        onChange={(v) => update({ ...current, label: v })}
      />
      <TextField
        label="Посилання"
        hint="Порожні обидва поля — кнопки не буде."
        value={current.href}
        onChange={(v) => update({ ...current, href: v })}
      />
    </fieldset>
  );
}
