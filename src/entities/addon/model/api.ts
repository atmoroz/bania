import { cacheLife, cacheTag } from "next/cache";

import { CONTENT_TAG, createPublicClient } from "@/shared/api";

import type { Addon } from "./types";

export async function getAddons(): Promise<Addon[]> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("addons")
    .select("slug, name, description, price, unit, category")
    .eq("is_visible", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load add-ons: ${error.message}`);
  return data ?? [];
}
