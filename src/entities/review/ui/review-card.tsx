import { Star } from "lucide-react";

import { Card } from "@/shared/ui";

import type { Review } from "../model/types";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <Card className="flex h-full flex-col gap-5 p-7">
      <div className="flex gap-1" aria-label={`Оцінка ${review.rating} з 5`}>
        {Array.from({ length: review.rating }, (_, i) => (
          <Star key={i} className="fill-bronze text-bronze size-4" aria-hidden />
        ))}
      </div>
      <blockquote className="text-[15px] leading-6 md:text-[18px] md:leading-7">
        «{review.body}»
      </blockquote>
      <footer className="border-bronze/15 mt-auto border-t pt-5">
        <p className="text-[15px] font-medium">{review.author}</p>
        <p className="text-muted-foreground mt-1 text-[13px]">{review.context}</p>
      </footer>
    </Card>
  );
}
