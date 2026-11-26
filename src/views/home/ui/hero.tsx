import Image from "next/image";

import { locations } from "@/entities/location";
import { siteConfig } from "@/shared/config/site";
import { ButtonLink, Container } from "@/shared/ui";

const facts = [
  { value: "100 °C", label: "Парна на дровах" },
  { value: "40–42 °C", label: "Карпатський чан" },
  { value: "100 %", label: "Приватна зона" },
  // Derived, so the headline number cannot drift from the actual data.
  { value: String(locations.length), label: "Автономні локації" },
];

export function Hero() {
  return (
    <section className="relative isolate">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/chan.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="from-background via-background/80 to-background/40 absolute inset-0 bg-gradient-to-t" />
      </div>

      <Container className="flex min-h-[80vh] flex-col justify-end py-20 md:min-h-[88vh] md:py-28">
        <p className="label-caps text-bronze">
          Автентичний банний ретрит • Київське урочище
        </p>

        <h1 className="font-display mt-6 max-w-4xl text-[38px] leading-11 text-balance md:text-[56px] md:leading-16">
          Справжня лазня &amp; гарячий чан на дровах
        </h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-[15px] leading-6 md:text-[18px] md:leading-7">
          {siteConfig.description}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/booking">Забронювати відпочинок</ButtonLink>
          <ButtonLink href="/locations" variant="ghost">
            Дослідити простір
          </ButtonLink>
        </div>

        <dl className="border-bronze/15 mt-16 grid grid-cols-2 gap-px border-t pt-10 md:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="pt-2">
              <dt className="font-display text-[28px] leading-9">{fact.value}</dt>
              <dd className="text-muted-foreground mt-1 text-[13px]">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
