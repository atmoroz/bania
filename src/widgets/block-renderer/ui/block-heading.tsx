import type { ReactNode } from "react";

import { getSocialLinks } from "@/entities/settings";
import { linkifyHandles } from "@/shared/lib";
import { SectionHeading } from "@/shared/ui";

/**
 * The eyebrow, title and lead of a block.
 *
 * Every block rendered the same three props by hand, and the lead needed
 * one thing none of them had: where the venue's Instagram is, so that an
 * @handle written in the text can be followed. The links are read here
 * rather than threaded through nine call sites, and the read is cached.
 */
export async function BlockHeading({
  content,
  action,
}: {
  content: { eyebrow?: string; title?: string; lead?: string };
  action?: ReactNode;
}) {
  const social = await getSocialLinks();
  const instagram = social.find((link) => link.kind === "instagram")?.url ?? null;

  return (
    <SectionHeading
      eyebrow={content.eyebrow}
      title={content.title}
      lead={content.lead ? linkifyHandles(content.lead, instagram) : undefined}
      action={action}
    />
  );
}
