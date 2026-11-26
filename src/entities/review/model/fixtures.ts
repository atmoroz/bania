import type { Review } from "./types";

/** FIXTURE DATA — from the owner's design. Replaced by the `reviews` table. */
export const reviews: readonly Review[] = [
  {
    id: "oleksandr-m",
    author: "Олександр М.",
    context: "Відпочинок у чані",
    body:
      "Чан просто космічний! Вода з хвоєю пахне на весь ліс, дно з камінням дуже " +
      "приємне для ніг. Після гарячого чану пірнути в басейн — відчуття, ніби " +
      "народився заново.",
    rating: 5,
  },
  {
    id: "kateryna-serhii",
    author: "Катерина та Сергій",
    context: "Баня #2 «Ніагара»",
    body:
      "Дуже чисто, красиво, затишно. Парна на дровах тримає ідеальну вологість, " +
      "а водоспад «Ніагара» — це справжній вибух свіжості. Обов'язково " +
      "повернемося взимку!",
    rating: 5,
  },
] as const;

/** Aggregate shown next to the review list. */
export const reviewSummary = {
  score: 4.9,
  outOf: 5,
  note: "На основі понад 120 відгуків у Google Maps та Instagram",
} as const;
