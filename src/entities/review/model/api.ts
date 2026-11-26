import { cacheLife, cacheTag } from "next/cache";

import { CONTENT_TAG, createPublicClient } from "@/shared/api";

import type { Review, ReviewSummary, WrittenReview } from "./types";

/** Approved reviews only — RLS enforces it, this just states the intent. */
export async function getReviews(): Promise<Review[]> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, author_name, context, body, rating")
    .eq("is_approved", true)
    // sort_order is the owner's hand-ordering; newest first within it, so a
    // review left today is not buried behind the seeded ones.
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    author: r.author_name,
    context: r.context,
    body: r.body,
    rating: r.rating,
  }));
}

/** Only those with something written: a card with no quote says nothing. */
export function writtenOnly(reviews: Review[]): WrittenReview[] {
  return reviews.filter((r): r is WrittenReview => r.body !== null && r.body.length > 0);
}

/**
 * The score counts every approved rating, including the ones left without a
 * review. Those are the majority — most people tap five stars and leave — and
 * dropping them would make the average the opinion of the talkative few.
 */
export function summarise(reviews: Review[]): ReviewSummary {
  if (reviews.length === 0) return { average: null, count: 0 };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { average: total / reviews.length, count: reviews.length };
}
