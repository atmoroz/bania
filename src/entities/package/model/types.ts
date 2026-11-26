/** A priced offer shown on the pricing page. Maps to the future `prices` table. */
export type Package = {
  slug: string;
  eyebrow: string;
  name: string;
  summary: string;
  /** Minor units per hour. */
  pricePerHour: number;
  minimumHours: number;
  includes: readonly string[];
  ctaLabel: string;
  featured: boolean;
};
