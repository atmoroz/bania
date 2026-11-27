import type { ReactNode } from "react";

import { Container } from "./container";

/**
 * The head of an admin page: a title, and the explanation folded away.
 *
 * Every tab used to open with 360 pixels of prose — the word
 * "Адмінпанель" repeated under the bar that already says it, a
 * display-serif heading the size of a magazine cover, and a paragraph
 * of guidance. On a laptop the operator saw a title and a sentence
 * before any data. The guidance is worth keeping and worth hiding: it
 * is read once.
 */
export function AdminPageHeader({
  title,
  children,
}: {
  title: string;
  /** The explanation, behind a disclosure. */
  children?: ReactNode;
}) {
  return (
    <Container className="pt-8">
      <div className="border-bronze/15 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b pb-4">
        <h1 className="font-display text-[24px] leading-8">{title}</h1>

        {children ? (
          <details className="group min-w-0">
            <summary className="label-caps text-muted-foreground hover:text-bronze cursor-pointer list-none transition-colors">
              Як це працює
            </summary>
            <p className="text-muted-foreground mt-3 max-w-[640px] text-[13px] leading-5">
              {children}
            </p>
          </details>
        ) : null}
      </div>
    </Container>
  );
}
