import type { ReactNode } from "react";

import { cn, linkifyHandles } from "@/shared/lib";

import { Container } from "./container";

/**
 * A vertical band of the page. Generous spacing is deliberate: the design
 * treats negative space as an active element, so sections breathe.
 */
export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      <Container>{children}</Container>
    </section>
  );
}

/** Small all-caps line above a heading, like an engraved plaque. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="label-caps text-bronze">{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Sits beside the title on a wide screen, under it on a narrow one. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn(action ? "max-w-5xl" : "max-w-3xl", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-10">
        <h2 className="font-display text-[28px] leading-9 text-balance md:text-[40px] md:leading-[48px]">
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {lead ? (
        <p className="text-muted-foreground mt-5 text-[15px] leading-6 md:text-[18px] md:leading-7">
          {/* A lead is plain text from the block editor; an @handle in it is
              meant to be followed. Anything already composed as elements is
              left as it is. */}
          {typeof lead === "string" ? linkifyHandles(lead) : lead}
        </p>
      ) : null}
    </header>
  );
}
