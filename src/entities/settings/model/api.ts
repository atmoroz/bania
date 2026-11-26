import { cacheLife, cacheTag } from "next/cache";

import { CONTENT_TAG, createPublicClient } from "@/shared/api";

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
