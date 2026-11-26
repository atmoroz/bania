import { cacheLife, cacheTag } from "next/cache";

import { CONTENT_TAG, createPublicClient } from "@/shared/api";

import type { Review } from "./types";

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
    .order("sort_order");

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    author: r.author_name,
    context: r.context,
    body: r.body,
    rating: r.rating,
  }));
}
