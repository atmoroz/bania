import { Card } from "@/shared/ui";

import type { WrittenReview } from "../model/types";
import { RatingStars } from "./rating-stars";

export function ReviewCard({ review }: { review: WrittenReview }) {
  return (
    // Equal height, and the signature sits on the floor of the card
    // with its rule: three cards whose names line up read as a row,
    // which is worth more than the space a short review leaves above.
    <Card ember="hover" className="lift flex h-full flex-col gap-4 p-6">
      <RatingStars value={review.rating} />
      <blockquote className="text-[15px] leading-6">
        «{review.body}»
      </blockquote>
      <footer className="border-bronze/15 mt-auto border-t pt-4">
        {/* Room for both lines whether or not the second one exists: a
            signature is at most a name and where they were, so the rule
            above it lands at the same height on every card in a row. */}
        <div className="min-h-12">
          {/* Unsigned reviews are allowed, so the card needs a word for one. */}
          <p className="text-[15px] font-medium">{review.author ?? "Гість"}</p>
          {review.context ? (
            <p className="text-muted-foreground mt-1 text-[13px]">{review.context}</p>
          ) : null}
        </div>
      </footer>
    </Card>
  );
}
