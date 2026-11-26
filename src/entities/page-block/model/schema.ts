import { z } from "zod";

/**
 * The shape of `page_blocks.content`.
 *
 * PostgreSQL stores this as jsonb and can only guarantee it is an object, so the
 * shape is defined and enforced here instead — see
 * docs/decisions/0009-page-blocks-for-editable-content.md. Parsing on read means a
 * malformed block is caught at the boundary rather than crashing a component.
 */

const cta = z.object({ label: z.string(), href: z.string() });

const statItem = z.object({
  value: z.string(),
  label: z.string(),
  isVisible: z.boolean().default(true),
});

const featureItem = z.object({
  icon: z.string(),
  title: z.string(),
  text: z.string(),
  isVisible: z.boolean().default(true),
});

/** Fields nearly every block shares. */
const heading = {
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  lead: z.string().optional(),
};

export const blockSchemas = {
  hero: z.object({
    ...heading,
    backgroundMediaPath: z.string().optional(),
    primaryCta: cta.optional(),
    secondaryCta: cta.optional(),
    stats: z.array(statItem).default([]),
  }),
  feature_grid: z.object({ ...heading, items: z.array(featureItem).default([]) }),
  locations: z.object({
    ...heading,
    showPrices: z.boolean().default(false),
    showBooking: z.boolean().default(false),
  }),
  addons: z.object(heading),
  gallery: z.object(heading),
  reviews: z.object({
    ...heading,
    display: z.enum(["grid", "slider"]).default("grid"),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
    summaryScore: z.string().optional(),
    summaryOutOf: z.string().optional(),
    summaryNote: z.string().optional(),
    /** Label for the button that jumps to the form further down the page. */
    writeLabel: z.string().optional(),
  }),
  contacts: z.object(heading),
  review_form: z.object({ ...heading, note: z.string().optional() }),
  booking_cta: z.object({ ...heading, note: z.string().optional() }),
  rich_text: z.object({ ...heading, body: z.string().optional() }),
  /** Retired: merged into `locations`. Kept so an old row cannot crash a page. */
  packages: z.object({ ...heading, showPrices: z.boolean().default(true) }),
} as const;

export type BlockType = keyof typeof blockSchemas;

export type BlockContent = {
  [K in BlockType]: z.infer<(typeof blockSchemas)[K]>;
};

/** A parsed block, narrowed by its type. */
export type Block = {
  [K in BlockType]: { id: string; type: K; content: BlockContent[K] };
}[BlockType];
