import { Flame, Home, Leaf, Sparkles } from "lucide-react";
import type { ComponentType } from "react";

import type { BlockContent } from "@/entities/page-block";
import { Reveal, Section } from "@/shared/ui";

import { BlockHeading } from "./block-heading";

/** Icons the owner can choose by name. Anything unknown falls back quietly. */
const icons: Record<string, ComponentType<{ className?: string }>> = {
  flame: Flame,
  home: Home,
  leaf: Leaf,
  sparkles: Sparkles,
};

export function FeatureGridBlock({ content }: { content: BlockContent["feature_grid"] }) {
  const items = content.items.filter((i) => i.isVisible);

  return (
    <Section className="bg-surface-low">
      <BlockHeading content={content} />
      {items.length > 0 ? (
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[item.icon] ?? Sparkles;
            return (
              <Reveal key={item.title} delay={i * 0.1}>
                <article>
                  <Icon className="text-bronze size-6" aria-hidden />
                  <h3 className="font-display mt-5 text-[22px] leading-7">{item.title}</h3>
                  <p className="text-muted-foreground mt-3 text-[15px] leading-6">
                    {item.text}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      ) : null}
    </Section>
  );
}
