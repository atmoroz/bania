import type { ReactNode } from "react";

import { cn } from "@/shared/lib";

/** Editorial page frame. Wide gutters are part of the design, not padding. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1280px] px-5 md:px-8 lg:px-16", className)}>
      {children}
    </div>
  );
}
