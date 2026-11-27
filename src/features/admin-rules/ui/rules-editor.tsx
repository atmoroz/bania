"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

import type { RuleItem, RuleKind } from "@/entities/rules/model/api";
import { cn } from "@/shared/lib";
import { Button, SaveBar, TextField } from "@/shared/ui";

import { getAdminRules, saveRules, type AdminRuleSection } from "../model/actions";

type Section = AdminRuleSection & { key: string };

const GROUPS: { kind: RuleKind; title: string; hint: string }[] = [
  {
    kind: "rules",
    title: "Правила",
    hint: "Вікно «Ознайомитись з правилами» під кнопкою бронювання.",
  },
  {
    kind: "included",
    title: "Що входить до бронювання",
    hint: "Вікно за значком «і» поруч із правилами: що вже у вартості години і що взяти з собою.",
  },
];

const withKeys = (sections: AdminRuleSection[]): Section[] =>
  sections.map((s, i) => ({ ...s, key: s.id ?? `new-${i}` }));

/**
 * The house rules, as sections of lines.
 *
 * One Save for the lot, like every other tab. Sections are reordered with
 * arrows rather than dragged: there are four of them, they are tall, and a
 * drag across a screen of text is worse than two clicks.
 */
export function RulesEditor({ initial }: { initial: AdminRuleSection[] }) {
  const [saved, setSaved] = useState(() => withKeys(initial));
  const [sections, setSections] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [busy, startWork] = useTransition();

  const dirty = JSON.stringify(sections) !== JSON.stringify(saved);

  const patch = (key: string, change: Partial<Section>) =>
    setSections(sections.map((s) => (s.key === key ? { ...s, ...change } : s)));

  /**
   * Moves a section within its own group. The two groups share one array,
   * so a move is computed among the neighbours of the same kind and then
   * written back into the whole list; the server numbers them in the order
   * it receives.
   */
  function move(key: string, direction: "up" | "down") {
    const group = sections.filter((s) => s.kind === getKind(key));
    const from = group.findIndex((s) => s.key === key);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= group.length) return;

    const reordered = [...group];
    const [item] = reordered.splice(from, 1);
    if (!item) return;
    reordered.splice(to, 0, item);

    const queue = [...reordered];
    setSections(sections.map((s) => (s.kind === item.kind ? queue.shift()! : s)));
  }

  function getKind(key: string): RuleKind {
    return sections.find((s) => s.key === key)?.kind ?? "rules";
  }

  function save() {
    if (sections.some((s) => s.title.trim() === "")) {
      setError("У кожної секції має бути назва.");
      return;
    }

    startWork(async () => {
      const result = await saveRules(sections);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      // Reloaded rather than assumed: new sections have ids now.
      const fresh = withKeys(await getAdminRules());
      setSaved(fresh);
      setSections(fresh);
    });
  }

  return (
    <>
      {error ? <p className="text-destructive mt-8 text-[15px]">{error}</p> : null}

      {GROUPS.map((group) => {
        const own = sections.filter((s) => s.kind === group.kind);
        return (
          <section key={group.kind} className="mt-12">
            <h2 className="font-display text-[22px] leading-7">{group.title}</h2>
            <p className="text-muted-foreground mt-2 max-w-[620px] text-[13px] leading-5">
              {group.hint}
            </p>

            <ul className="mt-6 flex flex-col gap-4">
              {own.map((section, index) => (
                <SectionEditor
                  key={section.key}
                  section={section}
                  index={index}
                  total={own.length}
                  onChange={(change) => patch(section.key, change)}
                  onMove={(direction) => move(section.key, direction)}
                  onRemove={() => setSections(sections.filter((s) => s.key !== section.key))}
                />
              ))}
              {own.length === 0 ? (
                <li className="text-muted-foreground/70 text-[13px]">Поки порожньо.</li>
              ) : null}
            </ul>

            <Button
              type="button"
              variant="ghost"
              className="mt-6"
              onClick={() =>
                setSections([
                  ...sections,
                  {
                    key: `new-${crypto.randomUUID()}`,
                    id: null,
                    kind: group.kind,
                    title: "",
                    intro: "",
                    items: [],
                    note: "",
                    isVisible: true,
                  },
                ])
              }
            >
              <Plus className="size-4" aria-hidden />
              Додати секцію
            </Button>
          </section>
        );
      })}

      <SaveBar
        status={dirty ? "Є незбережені зміни. На сайті їх ще не видно." : "Усе збережено."}
        dirty={dirty}
        busy={busy}
        onDiscard={() => {
          setError(null);
          setSections(saved);
        }}
        onSave={save}
      />
    </>
  );
}

function SectionEditor({
  section,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  section: Section;
  index: number;
  total: number;
  onChange: (change: Partial<Section>) => void;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(section.id === null);

  const setItem = (i: number, change: Partial<RuleItem>) =>
    onChange({ items: section.items.map((item, j) => (j === i ? { ...item, ...change } : item)) });

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= section.items.length) return;
    const next = [...section.items];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange({ items: next });
  };

  return (
    <li
      className={cn(
        "border",
        section.isVisible ? "border-bronze/15" : "bg-surface-low/50 border-dashed",
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
          <span className="text-[15px]">{section.title || "Без назви"}</span>
          <span className="text-muted-foreground text-[13px]">
            {section.items.length} правил
          </span>
          {!section.isVisible ? <span className="label-caps text-bronze">Приховано</span> : null}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Square label="Вище" disabled={index === 0} onClick={() => onMove("up")}>
            <ChevronUp className="size-4" aria-hidden />
          </Square>
          <Square label="Нижче" disabled={index === total - 1} onClick={() => onMove("down")}>
            <ChevronDown className="size-4" aria-hidden />
          </Square>
          <Square
            label={section.isVisible ? "Приховати секцію" : "Показати секцію"}
            onClick={() => onChange({ isVisible: !section.isVisible })}
          >
            {section.isVisible ? (
              <Eye className="size-4" aria-hidden />
            ) : (
              <EyeOff className="size-4" aria-hidden />
            )}
          </Square>
          <Square label="Видалити секцію" onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden />
          </Square>
        </div>
      </div>

      {open ? (
        <div className="border-bronze/10 flex flex-col gap-6 border-t p-5">
          <TextField
            label="Назва секції"
            value={section.title}
            onChange={(v) => onChange({ title: v })}
          />
          <TextField
            label="Вступ"
            hint="Необов’язковий абзац під назвою."
            rows={2}
            value={section.intro}
            onChange={(v) => onChange({ intro: v })}
          />

          <fieldset className="border-bronze/15 flex flex-col gap-4 border p-4">
            <legend className="label-caps text-muted-foreground px-2">Правила</legend>

            {section.items.length === 0 ? (
              <p className="text-muted-foreground/70 text-[13px]">Поки порожньо.</p>
            ) : (
              <ul className="flex flex-col gap-5">
                {section.items.map((item, i) => (
                  <li key={i} className="border-bronze/10 flex items-start gap-3 border-b pb-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <TextField
                        label={`Правило ${i + 1}`}
                        value={item.text}
                        onChange={(v) => setItem(i, { text: v })}
                      />
                      <TextField
                        label="Пояснення"
                        hint="Менший рядок під правилом. Можна лишити порожнім."
                        value={item.note ?? ""}
                        onChange={(v) => setItem(i, { note: v })}
                      />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Square label="Вище" disabled={i === 0} onClick={() => moveItem(i, i - 1)}>
                        <ChevronUp className="size-4" aria-hidden />
                      </Square>
                      <Square
                        label="Нижче"
                        disabled={i === section.items.length - 1}
                        onClick={() => moveItem(i, i + 1)}
                      >
                        <ChevronDown className="size-4" aria-hidden />
                      </Square>
                      <Square
                        label="Видалити"
                        onClick={() =>
                          onChange({ items: section.items.filter((_, j) => j !== i) })
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Square>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Button
              type="button"
              variant="ghost"
              className="self-start px-5 py-3"
              onClick={() => onChange({ items: [...section.items, { text: "", note: null }] })}
            >
              <Plus className="size-4" aria-hidden />
              Додати правило
            </Button>
          </fieldset>

          <TextField
            label="Примітка в кінці"
            hint="Виділений абзац під списком — зазвичай про право адміністрації."
            rows={2}
            value={section.note}
            onChange={(v) => onChange({ note: v })}
          />
        </div>
      ) : null}
    </li>
  );
}

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
