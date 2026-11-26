import { cacheLife, cacheTag } from "next/cache";

import { CONTENT_TAG, createPublicClient } from "@/shared/api";

import { blockSchemas, type Block, type BlockType } from "./schema";

/**
 * The visible blocks of a page, in order.
 *
 * RLS already hides a block whose page is hidden, so this returns nothing for a
 * page the owner has switched off — the route then renders not-found rather than
 * an empty shell.
 */
export async function getPageBlocks(slug: string): Promise<Block[]> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("page_blocks")
    .select("id, block_type, content")
    .eq("page_slug", slug)
    .eq("is_visible", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load blocks for "${slug}": ${error.message}`);

  return (data ?? []).flatMap((row) => {
    const schema = blockSchemas[row.block_type as BlockType];
    if (!schema) return [];

    const parsed = schema.safeParse(row.content);
    if (!parsed.success) {
      // A malformed block is skipped rather than allowed to break the page.
      // It can only ever render wrongly; it cannot double-book or leak anything.
      console.error(`Block ${row.id} (${row.block_type}) has invalid content`, parsed.error);
      return [];
    }

    return [{ id: row.id, type: row.block_type, content: parsed.data } as Block];
  });
}

/** Pages that belong in the navigation, in order. */
export async function getNavigation() {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("pages")
    .select("slug, nav_label")
    .eq("is_visible", true)
    .eq("show_in_nav", true)
    .order("sort_order");

  if (error) throw new Error(`Failed to load navigation: ${error.message}`);

  return (data ?? []).map((p) => ({
    href: p.slug === "" ? "/" : `/${p.slug}`,
    label: p.nav_label,
  }));
}
