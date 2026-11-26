import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/shared/lib";

type Variant = "primary" | "ghost";

const base =
  "label-caps inline-flex items-center justify-center gap-2 px-7 py-4 " +
  "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  // A disabled primary button kept its full bronze fill, which reads as the
  // thing to press next. Dimming it is the only signal that it is not.
  "focus-visible:outline-bronze disabled:opacity-40";

const variants: Record<Variant, string> = {
  // Solid smoked bronze, warming to ivory on hover.
  primary: "bg-bronze text-primary-foreground hover:bg-foreground",
  // "Ghost inscription": hairline boundary that fills softly on hover.
  ghost:
    "border border-bronze/40 text-foreground hover:border-bronze hover:bg-bronze/12",
};

/**
 * Links the router should not handle.
 *
 * tel:, mailto: and absolute URLs are not client-side routes. Neither is a
 * bare "#id": that is a position on the page the visitor is already on, and
 * routing it through next/link navigates without scrolling, so the button
 * silently does nothing. A plain anchor scrolls, and honours scroll-margin.
 */
const isExternal = (href: string) => /^(https?:|tel:|mailto:|#)/.test(href);

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(base, variants[variant], className);

  if (isExternal(href)) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
