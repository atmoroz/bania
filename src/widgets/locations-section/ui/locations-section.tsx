import { locations, LocationCard } from "@/entities/location";
import { Section, SectionHeading } from "@/shared/ui";

/**
 * The list of bookable zones. Shown both on the home page and as the whole of
 * /locations, so it lives here rather than being written twice.
 */
export function LocationsSection({ title }: { title: string }) {
  return (
    <Section>
      <SectionHeading
        eyebrow="Автономні простори"
        title={title}
        lead="Кожна зона функціонує повністю автономно, має власну огороджену територію, кімнату відпочинку та санвузли. Місткість: від 2 до 10 персон."
      />
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <LocationCard key={location.slug} location={location} />
        ))}
      </div>
    </Section>
  );
}
