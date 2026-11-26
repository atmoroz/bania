import { z } from "zod";

/**
 * What an editor stages for the preview route: the shape the page renders.
 *
 * Validated on the way out of the database even though only an
 * administrator can write it. The column is opaque jsonb, the writer is a
 * different deployment of this code than the reader may be, and a preview
 * that throws a type error is worse than one that says it is stale.
 */
export const stagedCard = z.object({
  slug: z.string(),
  name: z.string(),
  eyebrow: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  capacity: z.number().nullable().default(null),
  pricePerHour: z.number().nullable().default(null),
  minimumMinutes: z.number().default(60),
  highlights: z.array(z.string()).default([]),
  ctaLabel: z.string().nullable().default(null),
  isFeatured: z.boolean().default(false),
  image: z.object({ src: z.string(), alt: z.string() }).nullable().default(null),
  partOf: z.array(z.string()).default([]),
  photos: z
    .array(
      z.object({
        src: z.string(),
        alt: z.string().default(""),
        caption: z.string().nullable().default(null),
      }),
    )
    .default([]),
});

export const stagedPhoto = z.object({
  id: z.string(),
  src: z.string(),
  alt: z.string().default(""),
  title: z.string().nullable().default(null),
  caption: z.string().nullable().default(null),
});

export const stagedCatalogue = z.array(stagedCard);
export const stagedGallery = z.array(stagedPhoto);

export type StagedCard = z.input<typeof stagedCard>;
export type StagedPhoto = z.input<typeof stagedPhoto>;
