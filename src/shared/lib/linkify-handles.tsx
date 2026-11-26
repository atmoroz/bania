import type { ReactNode } from "react";

/**
 * An @handle written in body text becomes a link to the venue's Instagram.
 *
 * The owner writes "Більше фото в Instagram @staradoroga" into a block's
 * lead and means it to be clickable. The address comes from the settings,
 * never from the text: the first version built it out of the handle it
 * found, which sent people to whatever name happened to be written there —
 * and the name in that lead was two handles out of date.
 *
 * Deliberately narrow: the handle must start a word, so the domain in
 * welcome@staradoroga.ua is left alone, and only the characters Instagram
 * allows in a name are taken.
 */
const HANDLE = /(^|[\s(])@([A-Za-z0-9_.]{2,30})/g;

export function linkifyHandles(text: string, href: string | null): ReactNode {
  if (!href) return text;

  const parts: ReactNode[] = [];
  let at = 0;

  for (const match of text.matchAll(HANDLE)) {
    const [whole, before = "", handle = ""] = match;
    const start = match.index ?? 0;

    parts.push(text.slice(at, start) + before);
    parts.push(
      <a
        key={`${handle}-${start}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-bronze hover:text-foreground underline underline-offset-4 transition-colors"
      >
        @{handle}
      </a>,
    );
    at = start + whole.length;
  }

  if (parts.length === 0) return text;
  parts.push(text.slice(at));
  return parts;
}
