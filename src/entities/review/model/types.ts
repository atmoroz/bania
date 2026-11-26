export type Review = {
  id: string;
  /** Null when the visitor did not give one; shown as "Гість". */
  author: string | null;
  context: string | null;
  /** Null for a rating left without a review to go with it. */
  body: string | null;
  rating: number;
};

/** A review that carries text, and so can be shown as a card. */
export type WrittenReview = Review & { body: string };

export type ReviewSummary = {
  /** Mean of every approved rating, text or not. Null when there are none. */
  average: number | null;
  count: number;
};
