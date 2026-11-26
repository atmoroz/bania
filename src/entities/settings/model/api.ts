import { cacheLife, cacheTag } from "next/cache";

import { CONTENT_TAG, createPublicClient } from "@/shared/api";

import type { SocialKind } from "../ui/social-icon";

/**
 * Site-wide settings. Exactly one row exists, pinned by a check constraint.
 *
 * This replaces the former `shared/config/site.ts`: the same values, but editable
 * by the owner instead of living in the repository.
 */
export async function getSettings() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase.from("settings").select("*").limit(1).single();

  if (error) throw new Error(`Failed to load settings: ${error.message}`);
  return data;
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

/** A link in the footer: where the venue is, and which mark to draw. */
export type SocialLink = {
  id: string;
  kind: SocialKind;
  url: string;
  /** A handle, or what an "other" link actually is. */
  label: string | null;
};

/**
 * Where the venue is found, in the owner's order.
 *
 * Rows rather than columns on `settings`, so joining a network is a row and
 * not a migration. Only the visible ones come back — the RLS policy sees to
 * that, and asking again here would be a second rule to keep in step.
 */
export async function getSocialLinks(): Promise<SocialLink[]> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("social_links")
    .select("id, kind, url, label")
    .order("sort_order");

  if (error) throw new Error(`Failed to load social links: ${error.message}`);
  return data ?? [];
}
