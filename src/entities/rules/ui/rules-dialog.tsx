"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col p-0">
          <div className="border-bronze/15 shrink-0 border-b p-7 pb-5 md:p-9 md:pb-6">
            <p className="label-caps text-bronze">Стара Дорога</p>
            <DialogTitle className="mt-3">Правила та умови</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-3 text-[15px] leading-6">
              Коротко про те, як у нас заведено. Прочитайте перед бронюванням — так
              відпочинок почнеться без непорозумінь.
            </DialogDescription>
          </div>

          {/* The rules are long, so this part scrolls and the dialog itself
              stays inside the window — a fixed height for the list put the
              closing button off a short screen. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-7 pt-6 md:p-9 md:pt-7">
            <div className="flex flex-col gap-10">
              {sections.map((section, index) => (
                <section key={section.id}>
                  <h3 className="font-display flex items-baseline gap-3 text-[22px] leading-7">
                    <span className="label-caps text-bronze/70 text-[11px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
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
            <Button type="button" onClick={() => setOpen(false)}>
              Зрозуміло
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
