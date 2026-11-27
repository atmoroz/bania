import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";

import { CONTENT_TAG, createPublicClient } from "@/shared/api";

/** One line of a section: the rule, and the smaller line under it. */
export const ruleItem = z.object({
  text: z.string(),
  note: z.string().nullable().default(null),
});

export type RuleItem = z.infer<typeof ruleItem>;

export type RuleSection = {
  id: string;
  title: string;
  intro: string | null;
  items: RuleItem[];
  note: string | null;
};

/**
 * The house rules, in the owner's order.
 *
 * `items` is jsonb, so it is parsed rather than trusted: a section whose
 * list cannot be read shows its title and note and skips the list, which
 * is better than a dialog that throws.
 */
export async function getRules(): Promise<RuleSection[]> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("rule_sections")
    .select("id, title, intro, items, note")
    .order("sort_order");

  if (error) throw new Error(`Failed to load the rules: ${error.message}`);

  return (data ?? []).map((section) => {
    const parsed = z.array(ruleItem).safeParse(section.items);
    return {
      id: section.id,
      title: section.title,
      intro: section.intro,
      items: parsed.success ? parsed.data : [],
      note: section.note,
    };
  });
}
