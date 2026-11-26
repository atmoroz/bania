import { Star } from "lucide-react";

import { reviews, ReviewCard, reviewSummary } from "@/entities/review";
import { Card, Section, SectionHeading } from "@/shared/ui";

export function ReviewsPage() {
  return (
    <Section>
      <SectionHeading eyebrow="Досвід гостей" title="Відгуки про «Стару Дорогу»" />

      <Card className="mt-10 flex items-center gap-5 p-7">
        <Star className="fill-bronze text-bronze size-8 shrink-0" aria-hidden />
        <div>
          <p className="font-display text-[28px] leading-9">
            {reviewSummary.score} / {reviewSummary.outOf}
          </p>
          <p className="text-muted-foreground mt-1 text-[13px]">{reviewSummary.note}</p>
        </div>
      </Card>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </Section>
  );
}
