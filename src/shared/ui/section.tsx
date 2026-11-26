import type { ReactNode } from "react";

import { cn } from "@/shared/lib";

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
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("max-w-3xl", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="font-display mt-4 text-[28px] leading-9 text-balance md:text-[40px] md:leading-[48px]">
        {title}
      </h2>
      {lead ? (
        <p className="text-muted-foreground mt-5 text-[15px] leading-6 md:text-[18px] md:leading-7">
          {lead}
        </p>
      ) : null}
    </header>
  );
}
