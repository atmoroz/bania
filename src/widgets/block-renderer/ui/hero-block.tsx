import Image from "next/image";

import type { BlockContent } from "@/entities/page-block";
import { mediaUrl } from "@/shared/api";
import { ButtonLink, Container } from "@/shared/ui";

export function HeroBlock({ content }: { content: BlockContent["hero"] }) {
  const stats = content.stats.filter((s) => s.isVisible);

  return (
    <section className="relative isolate">
      {content.backgroundMediaPath ? (
        <div className="absolute inset-0 -z-10">
          <Image
            src={mediaUrl(content.backgroundMediaPath)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="from-background via-background/80 to-background/40 absolute inset-0 bg-gradient-to-t" />
        </div>
      ) : null}

      <Container className="flex min-h-[80vh] flex-col justify-end py-20 md:min-h-[88vh] md:py-28">
        {content.eyebrow ? <p className="label-caps text-bronze">{content.eyebrow}</p> : null}

        {content.title ? (
          <h1 className="font-display mt-6 max-w-4xl text-[38px] leading-11 text-balance md:text-[56px] md:leading-16">
            {content.title}
          </h1>
        ) : null}

        {content.lead ? (
          <p className="text-muted-foreground mt-6 max-w-2xl text-[15px] leading-6 md:text-[18px] md:leading-7">
            {content.lead}
          </p>
        ) : null}

        {content.primaryCta || content.secondaryCta ? (
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {content.primaryCta ? (
              <ButtonLink href={content.primaryCta.href}>{content.primaryCta.label}</ButtonLink>
            ) : null}
            {content.secondaryCta ? (
              <ButtonLink href={content.secondaryCta.href} variant="ghost">
                {content.secondaryCta.label}
              </ButtonLink>
            ) : null}
          </div>
        ) : null}

        {/* Each statistic is hidden individually from the admin panel, so an
            empty list simply removes the strip. */}
        {stats.length > 0 ? (
          <dl className="border-bronze/15 mt-16 grid grid-cols-2 gap-px border-t pt-10 md:grid-cols-4">
            {stats.map((stat) => (
              // Centred in its column. Left-aligned, the four read as a
              // ragged row: the last label is twice the width of its
              // number and ran to the very edge of the page, which looked
              // like a mistake rather than a layout.
              <div key={stat.label} className="pt-2 text-center">
                <dt className="font-display text-[28px] leading-9">{stat.value}</dt>
                <dd className="text-muted-foreground mt-1 text-[13px]">{stat.label}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Container>
    </section>
  );
}
