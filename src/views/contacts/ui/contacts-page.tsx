import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";

import { siteConfig } from "@/shared/config/site";
import { ButtonLink, Card, Section, SectionHeading } from "@/shared/ui";

export function ContactsPage() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Як нас знайти"
        title="Завітайте на справжній карпатський пар"
        lead="Комплекс розташований у затишному лісовому урочищі, всього за 25 хвилин їзди від межі Києва. Зручний заасфальтований під'їзд та закрита парковка під відеонаглядом."
      />

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Card className="p-7">
          <Phone className="text-bronze size-5" aria-hidden />
          <p className="label-caps text-muted-foreground mt-4">Телефон адміністратора</p>
          <a
            href={siteConfig.phone.href}
            className="font-display hover:text-bronze mt-2 block text-[22px] transition-colors"
          >
            {siteConfig.phone.display}
          </a>
          <p className="text-muted-foreground mt-3 text-[13px] leading-5">
            Бронювання підтверджує адміністратор у телефонній розмові.
          </p>
        </Card>

        <Card className="p-7">
          <Clock className="text-bronze size-5" aria-hidden />
          <p className="label-caps text-muted-foreground mt-4">Графік роботи</p>
          <p className="font-display mt-2 text-[22px]">{siteConfig.openingHoursNote}</p>
          <p className="text-muted-foreground mt-3 text-[13px] leading-5">
            За попереднім записом.
          </p>
        </Card>

        <Card className="p-7">
          <MapPin className="text-bronze size-5" aria-hidden />
          <p className="label-caps text-muted-foreground mt-4">Адреса комплексу</p>
          <p className="mt-2 text-[15px] leading-6">{siteConfig.address}</p>
          <ButtonLink
            href="https://maps.google.com/?q=Банний+комплекс+Стара+Дорога"
            variant="ghost"
            className="mt-5"
          >
            <Navigation className="size-4" aria-hidden />
            Відкрити карту
          </ButtonLink>
        </Card>

        <Card className="p-7">
          <Mail className="text-bronze size-5" aria-hidden />
          <p className="label-caps text-muted-foreground mt-4">Пошта</p>
          <a
            href={`mailto:${siteConfig.email}`}
            className="hover:text-bronze mt-2 block text-[15px] transition-colors"
          >
            {siteConfig.email}
          </a>
        </Card>
      </div>
    </Section>
  );
}
