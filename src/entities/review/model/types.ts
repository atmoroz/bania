/** A guest review. Maps to the future `reviews` table. */
export type Review = {
  id: string;
  author: string;
  context: string;
  body: string;
  rating: number;
};
