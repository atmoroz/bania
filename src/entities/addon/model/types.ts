/** An optional extra, priced per unit or as a flat service. */
export type Addon = {
  slug: string;
  name: string;
  description: string | null;
  /** Minor units. */
  price: number;
  /** Rendered after the price, e.g. "/ шт". Empty for a flat service. */
  unit: string;
};
