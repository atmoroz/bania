"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

import { cn, formatHryvnia } from "@/shared/lib";
import { Button, SaveBar, SwitchField, TextField } from "@/shared/ui";

import { getAdminAddons, saveAddons, type AdminAddon } from "../model/actions";

type Row = AdminAddon & { key: string };

const withKeys = (addons: AdminAddon[]): Row[] =>
  addons.map((a, i) => ({ ...a, key: a.id ?? `new-${i}` }));

const digits = (value: string) => {
  const n = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Everything sold beside the hour: brooms, scents, soak packets, linen.
 *
 * Twenty-two rows, so each is one line until it is opened — the list is
 * something to scan for a price, not a form to read. The order here is
 * the order on the site, and the groups follow from it: a category shows
 * where its first row sits.
 *
 * Prices are in hryvnia here and kopiyky in the database, like the
 * catalogue.
 */
export function AddonsEditor({ initial }: { initial: AdminAddon[] }) {
  const [saved, setSaved] = useState(() => withKeys(initial));
  const [rows, setRows] = useState(saved);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startWork] = useTransition();

  const dirty = JSON.stringify(rows) !== JSON.stringify(saved);
  const categories = [...new Set(rows.map((r) => r.category.trim()).filter(Boolean))];

  const patch = (key: string, change: Partial<Row>) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, ...change } : r)));

  function move(index: number, direction: "up" | "down") {
    const to = direction === "up" ? index - 1 : index + 1;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(to, 0, item);
    setRows(next);
  }

  function save() {
    if (rows.some((r) => r.name.trim() === "")) {
      setError("У кожної позиції має бути назва.");
      return;
    }

    startWork(async () => {
      const result = await saveAddons(rows);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      // Reloaded rather than assumed: new rows have ids and slugs now.
      const fresh = withKeys(await getAdminAddons());
      setSaved(fresh);
      setRows(fresh);
      setOpen(null);
    });
  }

  return (
    <>
      {error ? <p className="text-destructive mt-8 text-[15px]">{error}</p> : null}

      <ul className="mt-10 flex flex-col gap-2">
        {rows.map((row, index) => {
          const isOpen = open === row.key;
          // The heading repeats only where a group starts, so the list
          // shows its own grouping without a second level of nesting.
          const startsGroup =
            row.category.trim() !== "" && row.category.trim() !== rows[index - 1]?.category.trim();

          return (
            <li key={row.key}>
              {startsGroup ? (
                <p className="label-caps text-bronze mt-8 mb-3 first:mt-0">{row.category}</p>
              ) : null}

              <div
                className={cn(
                  "border",
                  row.isVisible ? "border-bronze/15" : "bg-surface-low/50 border-dashed",
                  row.id === null && "border-sage",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : row.key)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronUp className="text-bronze size-4 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown className="text-bronze size-4 shrink-0" aria-hidden />
                    )}
                    <span className="truncate text-[15px]">{row.name || "Без назви"}</span>
                    <span className="text-bronze ml-auto shrink-0 text-[15px]">
                      {formatHryvnia(row.price)}
                      {row.unit ? (
                        <span className="text-muted-foreground"> {row.unit}</span>
                      ) : null}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <Square label="Вище" disabled={index === 0} onClick={() => move(index, "up")}>
                      <ChevronUp className="size-4" aria-hidden />
                    </Square>
                    <Square
                      label="Нижче"
                      disabled={index === rows.length - 1}
                      onClick={() => move(index, "down")}
                    >
                      <ChevronDown className="size-4" aria-hidden />
                    </Square>
                    <Square
                      label={row.isVisible ? "Приховати з сайту" : "Показати на сайті"}
                      onClick={() => patch(row.key, { isVisible: !row.isVisible })}
                    >
                      {row.isVisible ? (
                        <Eye className="size-4" aria-hidden />
                      ) : (
                        <EyeOff className="size-4" aria-hidden />
                      )}
                    </Square>
                    <Square
                      label="Видалити позицію"
                      onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Square>
                  </div>
                </div>

                {isOpen ? (
                  <div className="border-bronze/10 flex flex-col gap-5 border-t p-5">
                    <TextField
                      label="Назва"
                      value={row.name}
                      onChange={(v) => patch(row.key, { name: v })}
                    />
                    <TextField
                      label="Опис"
                      hint="Рядок під назвою: склад, вага, обсяг. Можна лишити порожнім."
                      value={row.description}
                      onChange={(v) => patch(row.key, { description: v })}
                    />

                    <div className="grid gap-5 sm:grid-cols-3">
                      <TextField
                        label="Ціна, грн"
                        value={String(Math.round(row.price / 100))}
                        onChange={(v) => patch(row.key, { price: digits(v) * 100 })}
                      />
                      <TextField
                        label="Одиниця"
                        hint="Після ціни: «/ шт», «/ сет». Порожнє — просто ціна."
                        value={row.unit}
                        onChange={(v) => patch(row.key, { unit: v })}
                      />
                      <TextField
                        label="Група"
                        hint="Заголовок на сайті. Та сама назва збирає позиції разом."
                        list="addon-categories"
                        value={row.category}
                        onChange={(v) => patch(row.key, { category: v })}
                      />
                    </div>

                    <SwitchField
                      label="Показувати на сайті"
                      value={row.isVisible}
                      onChange={(v) => patch(row.key, { isVisible: v })}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {/* The groups that already exist, offered while typing rather than
          fixed in code: they are the owner's own headings. */}
      <datalist id="addon-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <Button
        type="button"
        variant="ghost"
        className="mt-6"
        onClick={() => {
          const key = `new-${crypto.randomUUID()}`;
          setRows([
            ...rows,
            {
              key,
              id: null,
              name: "",
              description: "",
              price: 0,
              unit: "",
              // Lands in the last group, which is where a new line
              // usually belongs.
              category: rows[rows.length - 1]?.category ?? "",
              isVisible: true,
            },
          ]);
          setOpen(key);
        }}
      >
        <Plus className="size-4" aria-hidden />
        Додати позицію
      </Button>

      <SaveBar
        status={dirty ? "Є незбережені зміни. На сайті їх ще не видно." : "Усе збережено."}
        dirty={dirty}
        busy={busy}
        onDiscard={() => {
          setError(null);
          setRows(saved);
        }}
        onSave={save}
      />
    </>
  );
}

/** A square button for one icon. */
function Square({
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
