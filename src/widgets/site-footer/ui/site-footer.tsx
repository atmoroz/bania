import Image from "next/image";
import Link from "next/link";
import { Camera, Check, Clock, Mail, MapPin, Phone } from "lucide-react";

import { navigation, siteConfig } from "@/shared/config/site";
import { Container } from "@/shared/ui";

const etiquette = [
  "Оренда банного простору від 2 годин",
  "Власна купіль та крижаний басейн",
  "Трав'яні збори та дубові віники",
];

export function SiteFooter() {
  return (
    <footer className="border-bronze/15 bg-surface-lowest mt-auto border-t">
      <Container className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Image
            src="/images/logo.png"
            alt={`Емблема банного комплексу «${siteConfig.name}»`}
            width={112}
            height={112}
            className="size-28 rounded-full"
          />
          <p className="label-caps text-bronze mt-6">{siteConfig.wordmark}</p>
          <p className="text-muted-foreground mt-4 max-w-sm text-[15px] leading-6">
            Автентична культура парної та гарячих чавунних чанів на дровах з хвоєю
            в оточенні вікового лісу. Простір глибокого відновлення тіла і розуму.
          </p>
          <a
            href={siteConfig.instagram.href}
            className="text-foreground hover:text-bronze mt-6 inline-flex items-center gap-2 text-[15px] transition-colors"
          >
            <Camera className="size-4" aria-hidden />
            Instagram {siteConfig.instagram.handle}
          </a>
        </div>

        <div>
          <p className="label-caps text-bronze">Локація та графік</p>
          <ul className="mt-5 flex flex-col gap-4 text-[15px] leading-6">
            <li className="flex gap-3">
              <MapPin className="text-sage mt-1 size-4 shrink-0" aria-hidden />
              <span>{siteConfig.address}</span>
            </li>
            <li className="flex gap-3">
              <Clock className="text-sage mt-1 size-4 shrink-0" aria-hidden />
              <span>{siteConfig.openingHoursNote} (за попереднім записом)</span>
            </li>
          </ul>

          <p className="label-caps text-bronze mt-8">Прямий зв&apos;язок</p>
          <ul className="mt-5 flex flex-col gap-4 text-[15px]">
            <li className="flex gap-3">
              <Phone className="text-sage mt-0.5 size-4 shrink-0" aria-hidden />
              <a href={siteConfig.phone.href} className="hover:text-bronze transition-colors">
                {siteConfig.phone.display}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail className="text-sage mt-0.5 size-4 shrink-0" aria-hidden />
              <a
                href={`mailto:${siteConfig.email}`}
                className="hover:text-bronze transition-colors"
              >
                {siteConfig.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="label-caps text-bronze">Гостьовий етикет</p>
          <ul className="mt-5 flex flex-col gap-4 text-[15px] leading-6">
            {etiquette.map((line) => (
              <li key={line} className="flex gap-3">
                <Check className="text-sage mt-1 size-4 shrink-0" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <p className="label-caps text-bronze mt-8">Розділи</p>
          <ul className="mt-5 flex flex-col gap-3 text-[15px]">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-bronze transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-bronze/15 border-t">
        {/* No year here on purpose: a rendered current year forces the page out
            of static prerendering, and a hardcoded one goes stale. */}
        <Container className="text-muted-foreground py-6 text-[13px]">
          © Банний комплекс &amp; Чан «{siteConfig.name}». Всі права захищено.
        </Container>
      </div>
    </footer>
  );
}
