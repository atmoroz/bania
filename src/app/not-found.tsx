import { ButtonLink, Section, SectionHeading } from "@/shared/ui";

export default function NotFound() {
  return (
    <Section>
      <SectionHeading
        eyebrow="404"
        title="Сторінку не знайдено"
        lead="Можливо, вона переїхала. Почніть з головної або подивіться наші локації."
      />
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">На головну</ButtonLink>
        <ButtonLink href="/pricing" variant="ghost">
          Локації та ціни
        </ButtonLink>
      </div>
    </Section>
  );
}
