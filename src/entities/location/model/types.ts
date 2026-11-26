/** A photograph shown in a card's detail view. */
export type LocationPhoto = {
  src: string;
  alt: string;
  caption: string | null;
};

/**
 * A card in the catalogue: what a visitor sees, picks and books.
 *
 * A card may be composed of other cards — `partOf` lists them — in which case
 * booking it occupies each of those zones rather than the card itself.
 */
export type Location = {
  slug: string;
  name: string;
  eyebrow: string | null;
  summary: string | null;
  description: string | null;
  capacity: number | null;
  /** Minor units, to keep money away from floats. */
  pricePerHour: number | null;
  /**
   * The minimum the database will actually enforce for this card, resolved
   * from its own override or the venue default. Minutes, because that is the
   * unit the rule is written in; the card divides for display.
   */
  minimumMinutes: number;
  highlights: string[];
  ctaLabel: string | null;
  isFeatured: boolean;
  image: { src: string; alt: string } | null;
  /** Names of the cards this one is made of; empty when it stands alone. */
  partOf: string[];
  photos: LocationPhoto[];
};
