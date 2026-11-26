"use client";

import { cn } from "@/shared/lib";
import { TextField } from "@/shared/ui";

const labelClass = "label-caps text-muted-foreground";

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
