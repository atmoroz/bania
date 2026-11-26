import { addons, AddonRow } from "@/entities/addon";
import { packages, PackageCard } from "@/entities/package";
import { Section, SectionHeading } from "@/shared/ui";

export function PricingPage() {
  return (
    <>
      <Section>
        <SectionHeading
          eyebrow="Чесні та прозорі тарифи"
          title="Вартість відпочинку та комплексні сети"
          lead="Оренда будь-якої зони здійснюється від 2 годин. У вартість кожного відвідування вже включено трав'яний чай, мед та базове банне приладдя."
        />
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {packages.map((item) => (
            <PackageCard key={item.slug} item={item} />
          ))}
        </div>
      </Section>

      <Section className="bg-surface-low">
        <SectionHeading
          eyebrow="Опціонально"
          title="Додаткові послуги та банні аксесуари"
        />
        <ul className="mt-10 flex flex-col">
          {addons.map((addon) => (
            <AddonRow key={addon.slug} addon={addon} />
          ))}
        </ul>
      </Section>
    </>
  );
}
