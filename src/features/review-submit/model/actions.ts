"use server";

import { createSupabaseServerClient } from "@/shared/api";

export type SubmitResult = { ok: true } | { ok: false; message: string };

/**
 * Leave a rating, with or without a review.
 *
 * Goes through submit_review rather than inserting: the function is the only
 * public way in, and it holds the ceiling on unmoderated submissions that an
 * RLS policy could not express. Nothing here is trusted — it is checked again
 * in the database.
 */
export async function submitReview(
  rating: number,
  body: string,
  author: string,
): Promise<SubmitResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Оберіть оцінку від 1 до 5 зірок." };
  }
  if (body.trim().length > 4000) {
    return { ok: false, message: "Відгук задовгий — до 4000 символів." };
  }
  if (author.trim().length > 120) {
    return { ok: false, message: "Ім’я задовге — до 120 символів." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_review", {
    p_rating: rating,
    p_body: body.trim() || undefined,
    p_author: author.trim() || undefined,
  });

  if (error) {
    const flooded = error.message.includes("awaiting moderation");
    return {
      ok: false,
      message: flooded
        ? "Зараз забагато відгуків очікує перевірки. Спробуйте, будь ласка, пізніше."
        : "Не вдалося надіслати відгук. Спробуйте, будь ласка, ще раз.",
    };
  }

  // Nothing cached changes: the review is unapproved, so the published list is
  // the same list it was a moment ago. It appears when the owner approves it.
  return { ok: true };
}
