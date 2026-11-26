import type { ReactNode } from "react";

/**
 * An @handle written in body text becomes a link to that Instagram account.
 *
 * The owner writes "Більше фото в Instagram @staradoroga" into a block's
 * lead, and means it to be clickable. Asking them to paste a URL instead
 * would read worse on the page, and a separate link field would be a second
 * place to keep the same name.
 *
 * Deliberately narrow: the handle must start a word, so the domain in
 * welcome@staradoroga.ua is left alone, and only the characters Instagram
 * allows in a name are taken.
 */
const HANDLE = /(^|[\s(])@([A-Za-z0-9_.]{2,30})/g;

export function linkifyHandles(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let at = 0;

  for (const match of text.matchAll(HANDLE)) {
    const [whole, before = "", handle = ""] = match;
    const start = match.index ?? 0;

    parts.push(text.slice(at, start) + before);
    parts.push(
      <a
        key={`${handle}-${start}`}
        href={`https://instagram.com/${handle}`}
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
