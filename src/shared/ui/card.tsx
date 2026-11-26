import type { ReactNode } from "react";

import { cn } from "@/shared/lib";

/**
 * "Sanctuary dark" card: a tonal step forward from the page, bounded by a
 * hairline bronze rule. The design rejects drop shadows entirely, so depth
 * comes from the surface colour and the border alone.
 */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-surface-container border-bronze/15 border", className)}>
      {children}
    </div>
  );
}
