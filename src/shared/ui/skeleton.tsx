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
 * Stand-in rows for the session list.
 *
 * Matches the real rows' height and spacing so the list does not jump when
 * the hours arrive — the point of a skeleton is that nothing moves when it
 * is replaced.
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
