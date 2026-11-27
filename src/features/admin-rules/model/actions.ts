"use server";

import { updateTag } from "next/cache";

import type { RuleItem, RuleKind } from "@/entities/rules/model/api";
import { CONTENT_TAG, createSupabaseServerClient, getAdmin } from "@/shared/api";

export type AdminRuleSection = {
  id: string | null;
  /** Which dialog it appears in: the rules, or what a booking includes. */
  kind: RuleKind;
  title: string;
  intro: string;
  items: RuleItem[];
  note: string;
  isVisible: boolean;
};

export type RulesResult = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

/** Every section, hidden ones included, in display order. */
export async function getAdminRules(): Promise<AdminRuleSection[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rule_sections")
    .select("id, kind, title, intro, items, note, is_visible")
    .order("kind")
    .order("sort_order");

  if (error) throw new Error(`Failed to load the rules: ${error.message}`);

  return (data ?? []).map((s) => ({
    id: s.id,
    kind: s.kind === "included" ? ("included" as const) : ("rules" as const),
    title: s.title,
    intro: s.intro ?? "",
    // Read defensively: the column is jsonb, and a shape the editor cannot
    // show is better dropped than crashing the tab that would fix it.
    items: Array.isArray(s.items)
      ? s.items.flatMap((item) =>
          item && typeof item === "object" && "text" in item
            ? [{ text: String(item.text ?? ""), note: toNote(item) }]
            : [],
        )
      : [],
    note: s.note ?? "",
    isVisible: s.is_visible,
  }));
}

function toNote(item: object): string | null {
  const note = "note" in item ? item.note : null;
  return typeof note === "string" && note.trim() !== "" ? note : null;
}

/** Saves every section in one transaction; see `20261127100000_rules.sql`. */
export async function saveRules(sections: AdminRuleSection[]): Promise<RulesResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_rules", {
    payload: sections.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      intro: s.intro,
      note: s.note,
      is_visible: s.isVisible,
      // A rule with no text is a line the owner started and left.
      items: s.items
        .filter((item) => item.text.trim() !== "")
        .map((item) => ({ text: item.text.trim(), note: item.note?.trim() || null })),
    })),
  });

  if (error) return { ok: false, message: `Не вдалося зберегти: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}
