"use server";

import { updateTag } from "next/cache";

import { CONTENT_TAG, createSupabaseServerClient, getAdmin } from "@/shared/api";

export type AdminReview = {
  id: string;
  author: string | null;
  body: string | null;
  rating: number;
  isApproved: boolean;
  createdAt: string;
};

export type ReviewActionResult = { ok: true } | { ok: false; message: string };

/**
 * Authorisation, not authentication. RLS would refuse the write anyway; this
 * turns a silent empty result into an error we can show.
 */
async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

export async function getAdminReviews(): Promise<AdminReview[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, author_name, body, rating, is_approved, created_at")
    // Waiting ones first: they are the only ones needing a decision.
    .order("is_approved")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    author: r.author_name,
    body: r.body,
    rating: r.rating,
    isApproved: r.is_approved,
    createdAt: r.created_at,
  }));
}

export async function setReviewApproved(
  id: string,
  isApproved: boolean,
): Promise<ReviewActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reviews").update({ is_approved: isApproved }).eq("id", id);

  if (error) return { ok: false, message: `Не вдалося зберегти: ${error.message}` };

  // updateTag rather than revalidateTag: this runs in a Server Action and the
  // owner should see the public page change on the next look, not eventually.
  updateTag(CONTENT_TAG);
  return { ok: true };
}
