import { cn } from "@/shared/lib";

/**
 * A placeholder with the shape of the thing being loaded.
 *
 * Deliberately a block of the surface colour rather than a shimmering
 * gradient: the design builds depth from flat tonal steps, and a moving
 * highlight would be the only animated surface on the page.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-foreground/8 animate-pulse", className)} aria-hidden />;
}

/**
 * Stand-in chips for the public day grid.
 *
 * The same three columns and the same chip height as the hours it
 * stands in for, so nothing moves when they arrive — which is the whole
 * point of a skeleton, and which the old row-shaped one stopped doing
 * the day the list became a grid.
 */
export function SlotGridSkeleton({ chips = 16 }: { chips?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Завантажуємо вільні години…</span>
      {Array.from({ length: chips }, (_, i) => (
        <div
          key={i}
          // The height of a free chip: twelve of padding either side of
          // one line of type, plus the hairline. Measured against the
          // real grid rather than guessed, so the swap does not shift
          // the page.
          className="border-bronze/10 flex h-[50px] items-center justify-center border px-2"
        >
          <Skeleton className="h-[15px] w-[104px]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Stand-in rows for the session list.
 *
 * Still a column in the admin panel, where the day is a list of rows
 * with names and buttons on them. Matches their height and spacing so
 * nothing jumps when the real ones arrive.
 */
export function SlotListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 py-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Завантажуємо вільні години…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="border-bronze/10 flex items-center justify-between border px-5 py-4"
        >
          <Skeleton className="h-[15px] w-[120px]" />
          <Skeleton className="h-[11px] w-[64px]" />
        </div>
      ))}
    </div>
  );
}
