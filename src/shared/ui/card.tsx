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
  ember,
}: {
  children: ReactNode;
  className?: string;
  /**
   * A warm arc that travels the frame: "hover" wakes it under the
   * pointer, "always" keeps it turning. Use "always" sparingly — it is
   * for the one frame on a page that should be looked at first.
   */
  ember?: "hover" | "always";
}) {
  return (
    <div
      className={cn(
        "bg-surface-container border-bronze/15 border",
        ember === "always" && "ember",
        ember === "hover" && "ember-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}
