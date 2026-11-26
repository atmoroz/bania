import type { ReactNode } from "react";

import { getSettings } from "@/entities/settings";
import { linkifyHandles } from "@/shared/lib";
import { SectionHeading } from "@/shared/ui";

/**
 * The eyebrow, title and lead of a block.
 *
 * Every block rendered the same three props by hand, and the lead needed
 * one thing none of them had: where the venue's Instagram is, so that an
 * @handle written in the text can be followed. Settings are read here
 * rather than threaded through nine call sites, and the read is cached.
 */
export async function BlockHeading({
  content,
  action,
}: {
  content: { eyebrow?: string; title?: string; lead?: string };
  action?: ReactNode;
}) {
  const settings = await getSettings();

  return (
    <SectionHeading
      eyebrow={content.eyebrow}
      title={content.title}
      lead={content.lead ? linkifyHandles(content.lead, settings.instagram_url) : undefined}
      action={action}
    />
  );
}
