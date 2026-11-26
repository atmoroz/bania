"use client";

import { Check, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";

// Straight from the module, not the slice barrel: the barrel also exports the
// cached server query, and importing it here drags "use cache" into the client
// bundle, which the build rejects.
import { RatingStars } from "@/entities/review/ui/rating-stars";
import { cn, formatVenueDate } from "@/shared/lib";
import { Button } from "@/shared/ui";

import { setReviewApproved, type AdminReview } from "../model/actions";

export function AdminReviewList({ reviews }: { reviews: AdminReview[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startSaving] = useTransition();

  function decide(id: string, isApproved: boolean) {
    setBusyId(id);
    startSaving(async () => {
      const result = await setReviewApproved(id, isApproved);
      setBusyId(null);
      setError(result.ok ? null : result.message);
    });
  }

  if (reviews.length === 0) {
    return <p className="text-muted-foreground mt-10 text-[15px]">Відгуків поки немає.</p>;
  }

  return (
    <>
      {error ? <p className="text-destructive mt-6 text-[15px]">{error}</p> : null}

      <ul className="mt-10 flex flex-col gap-4">
        {reviews.map((review) => (
          <li
            key={review.id}
            className={cn(
              "flex flex-col gap-4 border p-5 md:flex-row md:items-start md:justify-between md:gap-8",
              review.isApproved ? "border-bronze/10" : "border-bronze/50 bg-bronze/5",
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <RatingStars value={review.rating} />
                <span className="text-[15px]">{review.author ?? "Гість"}</span>
                <span className="text-muted-foreground text-[13px]">
                  {formatVenueDate(review.createdAt)}
                </span>
                {!review.isApproved ? (
                  <span className="label-caps text-bronze">Очікує</span>
                ) : null}
              </div>

              {review.body ? (
                <p className="mt-3 text-[15px] leading-6">«{review.body}»</p>
              ) : (
                <p className="text-muted-foreground mt-3 text-[14px] italic">
                  Лише оцінка, без тексту
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              {review.isApproved ? (
                <Button
                  variant="ghost"
                  disabled={busyId === review.id}
                  onClick={() => decide(review.id, false)}
                >
                  <EyeOff className="size-4" aria-hidden />
                  Приховати
                </Button>
              ) : (
                <Button
                  disabled={busyId === review.id}
                  onClick={() => decide(review.id, true)}
                >
                  <Check className="size-4" aria-hidden />
                  Опублікувати
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
