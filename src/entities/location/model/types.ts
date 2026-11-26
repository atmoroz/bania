/**
 * A location is one independently bookable zone of the complex.
 * It maps to the `rooms` table (see docs/DATABASE.md) — the field names are
 * kept close on purpose, so swapping fixtures for database rows is a change
 * of source, not of shape.
 */
export type Location = {
  slug: string;
  name: string;
  /** One line for the card. */
  summary: string;
  /** Full prose for the location page. */
  description: string;
  capacity: number;
  /** Minor units (kopiyky) per hour, to keep money away from floats. */
  pricePerHour: number;
  highlights: readonly string[];
  image: { src: string; alt: string };
  sortOrder: number;
};
