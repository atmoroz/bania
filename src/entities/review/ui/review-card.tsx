import { Card } from "@/shared/ui";

import type { WrittenReview } from "../model/types";
import { RatingStars } from "./rating-stars";

export function ReviewCard({ review }: { review: WrittenReview }) {
  return (
    <Card className="flex h-full flex-col gap-5 p-7">
      <RatingStars value={review.rating} />
      <blockquote className="text-[15px] leading-6 md:text-[18px] md:leading-7">
        «{review.body}»
      </blockquote>
      <footer className="border-bronze/15 mt-auto border-t pt-5">
        {/* Unsigned reviews are allowed, so the card needs a word for one. */}
        <p className="text-[15px] font-medium">{review.author ?? "Гість"}</p>
        {review.context ? (
          <p className="text-muted-foreground mt-1 text-[13px]">{review.context}</p>
        ) : null}
      </footer>
    </Card>
  );
}
