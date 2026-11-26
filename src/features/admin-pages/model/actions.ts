"use server";

import { updateTag } from "next/cache";

import { blockSchemas, type BlockType } from "@/entities/page-block";
import { CONTENT_TAG, createSupabaseServerClient, getAdmin } from "@/shared/api";

export type AdminPage = {
  slug: string;
  navLabel: string;
  title: string;
  isVisible: boolean;
  showInNav: boolean;
};

export type AdminBlock = {
  id: string;
  type: BlockType;
  sortOrder: number;
  isVisible: boolean;
  /** Parsed against the type's schema, so the editor never sees a raw blob. */
  content: Record<string, unknown>;
};

export type PageActionResult = { ok: true } | { ok: false; message: string };

/**
 * A save returns what was stored, not merely that it worked.
 *
 * zod normalises on the way in — it fills defaults and drops keys it does not
 * know — so the row afterwards is not byte-identical to what the editor sent.
 * Handing the stored version back lets the editor hold exactly what the
 * database holds, instead of guessing whether its copy still matches.
 */
export type SaveResult =
  | { ok: true; content: Record<string, unknown> }
  | { ok: false; message: string };

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

export async function getAdminPages(): Promise<AdminPage[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .select("slug, nav_label, title, is_visible, show_in_nav")
    .order("sort_order");

  if (error) throw new Error(`Failed to load pages: ${error.message}`);

  return (data ?? []).map((p) => ({
    slug: p.slug,
    navLabel: p.nav_label,
    title: p.title,
    isVisible: p.is_visible,
    showInNav: p.show_in_nav,
  }));
}

/**
 * Every block of a page, hidden ones included.
 *
 * The public reader skips a block whose content does not parse, because a
 * broken block must not take a page down with it. Here the opposite is right:
 * a block the owner cannot see is a block they cannot repair, so an unparsable
 * one is handed over as it stands and the editor shows what is there.
 */
export async function getAdminBlocks(pageSlug: string): Promise<AdminBlock[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("page_blocks")
    .select("id, block_type, sort_order, is_visible, content")
    .eq("page_slug", pageSlug)
    .order("sort_order");

  if (error) throw new Error(`Failed to load blocks: ${error.message}`);

  return (data ?? []).map((row) => {
    const type = row.block_type as BlockType;
    const schema = blockSchemas[type];
    const parsed = schema?.safeParse(row.content);

    return {
      id: row.id,
      type,
      sortOrder: row.sort_order,
      isVisible: row.is_visible,
      content: (parsed?.success ? parsed.data : (row.content ?? {})) as Record<string, unknown>,
    };
  });
}

/**
 * Save a block's content.
 *
 * Validated here with the same schema the site reads through, so the editor
 * cannot write a shape the renderer will later refuse. The browser is not
 * trusted to have done it.
 */
export async function saveBlockContent(
  id: string,
  type: BlockType,
  content: unknown,
): Promise<SaveResult> {
  await requireAdmin();

  const schema = blockSchemas[type];
  if (!schema) return { ok: false, message: `Невідомий тип блоку: ${type}` };

  const parsed = schema.safeParse(content);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      message: first ? `${first.path.join(".") || "Вміст"}: ${first.message}` : "Некоректний вміст.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("page_blocks")
    .update({ content: parsed.data })
    .eq("id", id);

  if (error) return { ok: false, message: `Не вдалося зберегти: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true, content: parsed.data as Record<string, unknown> };
}

export async function setBlockVisible(id: string, isVisible: boolean): Promise<PageActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("page_blocks").update({ is_visible: isVisible }).eq("id", id);

  if (error) return { ok: false, message: `Не вдалося зберегти: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}

/**
 * Move a block one place up or down by swapping `sort_order` with its
 * neighbour.
 *
 * Two updates rather than a renumbering pass: only two rows change, and if the
 * second fails the first is a swap with a row that still holds the old value,
 * which is visible and repairable. A half-finished renumbering would not be.
 */
export async function moveBlock(
  pageSlug: string,
  id: string,
  direction: "up" | "down",
): Promise<PageActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data: blocks, error } = await supabase
    .from("page_blocks")
    .select("id, sort_order")
    .eq("page_slug", pageSlug)
    .order("sort_order");

  if (error) return { ok: false, message: `Не вдалося прочитати порядок: ${error.message}` };

  const ordered = blocks ?? [];
  const index = ordered.findIndex((b) => b.id === id);
  const neighbour = ordered[direction === "up" ? index - 1 : index + 1];
  const current = ordered[index];

  if (index === -1 || !current || !neighbour) return { ok: true };

  const [a, b] = await Promise.all([
    supabase.from("page_blocks").update({ sort_order: neighbour.sort_order }).eq("id", current.id),
    supabase.from("page_blocks").update({ sort_order: current.sort_order }).eq("id", neighbour.id),
  ]);

  if (a.error || b.error) {
    return { ok: false, message: `Не вдалося змінити порядок: ${(a.error ?? b.error)?.message}` };
  }

  updateTag(CONTENT_TAG);
  return { ok: true };
}
