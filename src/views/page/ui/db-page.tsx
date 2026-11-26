import { notFound } from "next/navigation";

import { getPageBlocks } from "@/entities/page-block";
import { BlockRenderer } from "@/widgets/block-renderer";

/**
 * Every public route renders through here: fetch the page's visible blocks and
 * draw them in order. A page the owner has hidden returns no blocks — RLS sees
 * to that — so the route becomes a 404 rather than an empty shell.
 */
export async function DbPage({ slug }: { slug: string }) {
  const blocks = await getPageBlocks(slug);
  if (blocks.length === 0) notFound();
  return <BlockRenderer blocks={blocks} />;
}
