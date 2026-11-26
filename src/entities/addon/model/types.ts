/** An optional extra, priced either per hour-less unit or as a flat service. */
export type Addon = {
  slug: string;
  name: string;
  description: string;
  /** Minor units. */
  price: number;
  /** Rendered after the price, e.g. "/ шт". Empty for a flat service. */
  unit: string;
};
