"use client";

import { useState, type ReactNode } from "react";
import { Info, ScrollText } from "lucide-react";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui";

import type { RuleSection } from "../model/api";

/**
 * The house rules, where somebody about to book will see them.
 *
 * They lived in Instagram stories: five pictures of text, unreadable on a
 * desktop and impossible to change without redrawing. Here they are read
 * at the moment they matter — beside the booking button — and the
 * administrator edits them as text.
 */
export function RulesDialog({ sections }: { sections: RuleSection[] }) {
  const [open, setOpen] = useState(false);
  if (sections.length === 0) return null;

  return (
    <>
      <Button type="button" variant="ghost" className="w-full" onClick={() => setOpen(true)}>
        <ScrollText className="size-4" aria-hidden />
        Ознайомитись з правилами
      </Button>

      <SectionsDialog
        open={open}
        onOpenChange={setOpen}
        eyebrow="Стара Дорога"
        title="Правила та умови"
        description="Коротко про те, як у нас заведено. Прочитайте перед бронюванням — так
          відпочинок почнеться без непорозумінь."
        sections={sections}
      />
    </>
  );
}

/**
 * What the hour already includes, and what to bring.
 *
 * An icon rather than a second sentence: it sits beside the rules under
 * the booking button, and two full-width buttons there would read as two
 * decisions to make rather than one thing to do.
 */
export function IncludedDialog({ sections }: { sections: RuleSection[] }) {
  const [open, setOpen] = useState(false);
  if (sections.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Що входить до бронювання"
        title="Що входить до бронювання"
        // Width fixed, height taken from the row: a hard-coded square was
        // four pixels shorter than the button beside it.
        className="border-bronze/30 text-bronze hover:border-bronze hover:bg-bronze/10 flex w-[50px] shrink-0 items-center justify-center border transition-colors"
      >
        <Info className="size-5" aria-hidden />
      </button>

      <SectionsDialog
        open={open}
        onOpenChange={setOpen}
        eyebrow="Без прихованих доплат"
        title="Перед візитом"
        description="Що вже входить у вартість години — однаково для чану та бань — і що
          варто взяти з собою."
        sections={sections}
      />
    </>
  );
}

/** The body both dialogs share: numbered sections, lines, a closing note. */
function SectionsDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  sections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  description: ReactNode;
  sections: RuleSection[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col p-0">
        <div className="border-bronze/15 shrink-0 border-b p-7 pb-5 md:p-9 md:pb-6">
          <p className="label-caps text-bronze">{eyebrow}</p>
          <DialogTitle className="mt-3">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-3 text-[15px] leading-6">
            {description}
          </DialogDescription>
        </div>

        {/* The lists are long, so this part scrolls and the dialog itself
            stays inside the window — a fixed height for the list put the
            closing button off a short screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-7 pt-6 md:p-9 md:pt-7">
          <div className="flex flex-col gap-10">
            {sections.map((section, index) => (
              <section key={section.id}>
                <h3 className="font-display flex items-baseline gap-3 text-[22px] leading-7">
                  {/* Numbered only where there are several: a lone "01"
                      above a single list is a label for nothing. */}
                  {sections.length > 1 ? (
                    <span className="label-caps text-bronze/70 text-[11px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  ) : null}
                  {section.title}
                </h3>

                {section.intro ? (
                  <p className="text-muted-foreground mt-3 text-[15px] leading-6">
                    {section.intro}
                  </p>
                ) : null}

                {section.items.length > 0 ? (
                  <ul className="mt-5 flex flex-col gap-4">
                    {section.items.map((item, i) => (
                      <li key={i} className="border-bronze/20 border-l pl-4">
                        <p className="text-[15px] leading-6">{item.text}</p>
                        {item.note ? (
                          <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                            {item.note}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.note ? (
                  <p className="border-bronze/20 bg-surface-low text-muted-foreground mt-5 border p-4 text-[13px] leading-5">
                    {section.note}
                  </p>
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <div className="border-bronze/15 flex shrink-0 justify-end border-t p-5 md:px-9">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Зрозуміло
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
