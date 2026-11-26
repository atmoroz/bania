import { Star } from "lucide-react";

import { cn } from "@/shared/lib";

/**
 * Five stars, filled up to `value`.
 *
 * Always five rather than only the earned ones: four filled stars out of five
 * reads as four out of five, where four stars alone reads as a perfect score
 * until you count the others.
 */
export function RatingStars({
  value,
  className,
  starClassName,
}: {
  value: number;
  className?: string;
  starClassName?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)} aria-label={`Оцінка ${value} з 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            "size-4",
            i < value ? "fill-bronze text-bronze" : "text-bronze/25",
            starClassName,
          )}
        />
      ))}
    </div>
  );
}
