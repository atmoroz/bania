import { CalendarClock, Phone } from "lucide-react";

import { locations } from "@/entities/location";
import { siteConfig } from "@/shared/config/site";
import { ButtonLink, Card, Section, SectionHeading } from "@/shared/ui";

/**
 * Placeholder for the availability calendar, which arrives in stage 5
 * (see docs/ROADMAP.md). It needs the database, so it cannot be built yet.
 *
 * What is already correct here and must survive: the page explains that a
 * booking is agreed by telephone, and the administrator's number is the
 * single route from interest to a booking.
 */
export function BookingPage() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Бронювання"
        title="Оберіть локацію, дату та час"
        lead="Календар показує, які години вільні, а які вже зайняті. Саме бронювання підтверджує адміністратор у телефонній розмові — так ми встигаємо узгодити деталі відпочинку."
      />

      <Card className="mt-12 flex flex-col items-start gap-6 p-8 md:p-12">
        <CalendarClock className="text-bronze size-8" aria-hidden />
        <div>
          <h2 className="font-display text-[28px] leading-9">Календар у розробці</h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-6">
            Поки що зателефонуйте адміністратору — він підкаже вільні години та
            забронює зручний для вас сеанс.
          </p>
        </div>
        <ButtonLink href={siteConfig.phone.href}>
          <Phone className="size-4" aria-hidden />
          {siteConfig.phone.display}
        </ButtonLink>
      </Card>

      <div className="mt-16">
        <p className="label-caps text-bronze">Що можна забронювати</p>
        <ul className="border-bronze/15 mt-6 flex flex-col border-t">
          {locations.map((location) => (
            <li
              key={location.slug}
              className="border-bronze/15 flex flex-col gap-1 border-b py-5 sm:flex-row sm:items-baseline sm:justify-between"
            >
              <span className="text-[15px]">{location.name}</span>
              <span className="text-muted-foreground text-[13px]">
                до {location.capacity} осіб
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
