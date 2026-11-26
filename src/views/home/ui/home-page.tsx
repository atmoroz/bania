import { reviews, ReviewCard } from "@/entities/review";
import { ButtonLink, Section, SectionHeading } from "@/shared/ui";
import { LocationsSection } from "@/widgets/locations-section";

import { Hero } from "./hero";
import { Philosophy } from "./philosophy";

export function HomePage() {
  return (
    <>
      <Hero />
      <Philosophy />
      <LocationsSection title="Локації комплексу" />

      <Section className="bg-surface-low">
        <SectionHeading eyebrow="Досвід гостей" title="Що кажуть ті, хто відвідав нас" />
        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
        <ButtonLink href="/reviews" variant="ghost" className="mt-10">
          Усі відгуки
        </ButtonLink>
      </Section>
    </>
  );
}
