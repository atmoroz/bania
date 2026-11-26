import Link from "next/link";
import { Camera, Check, Clock, Mail, MapPin, Phone } from "lucide-react";

import { getNavigation } from "@/entities/page-block";
import { getSettings } from "@/entities/settings";
import { Container, LogoMark } from "@/shared/ui";

const etiquette = [
  "Оренда банного простору від 2 годин",
  "Власна купіль та крижаний басейн",
  "Трав'яні збори та дубові віники",
];

/** `bare` drops the section links, for the preview: see SiteHeaderClient. */
export async function SiteFooter({ bare = false }: { bare?: boolean } = {}) {
  const [settings, navigation] = await Promise.all([getSettings(), getNavigation()]);

  return (
    <footer className="border-bronze/15 bg-surface-lowest mt-auto border-t">
      <Container className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <LogoMark
            id="footer"
            title={`Емблема банного комплексу «${settings.site_title}»`}
            className="size-28"
          />
          <p className="label-caps text-bronze mt-6">{settings.wordmark}</p>
          <p className="text-muted-foreground mt-4 max-w-sm text-[15px] leading-6">
            Автентична культура парної та гарячих чавунних чанів на дровах з хвоєю
            в оточенні вікового лісу. Простір глибокого відновлення тіла і розуму.
          </p>
          {settings.instagram_url ? (
            <a
              href={settings.instagram_url}
              className="text-foreground hover:text-bronze mt-6 inline-flex items-center gap-2 text-[15px] transition-colors"
            >
              <Camera className="size-4" aria-hidden />
              Instagram {settings.instagram_handle}
            </a>
          ) : null}
        </div>

        <div>
          <p className="label-caps text-bronze">Локація та графік</p>
          <ul className="mt-5 flex flex-col gap-4 text-[15px] leading-6">
            {settings.address ? (
              <li className="flex gap-3">
                <MapPin className="text-sage mt-1 size-4 shrink-0" aria-hidden />
                <span>{settings.address}</span>
              </li>
            ) : null}
            <li className="flex gap-3">
              <Clock className="text-sage mt-1 size-4 shrink-0" aria-hidden />
              <span>{settings.opening_hours_note} (за попереднім записом)</span>
            </li>
          </ul>

          <p className="label-caps text-bronze mt-8">Прямий зв&apos;язок</p>
          <ul className="mt-5 flex flex-col gap-4 text-[15px]">
            <li className="flex gap-3">
              <Phone className="text-sage mt-0.5 size-4 shrink-0" aria-hidden />
              <a
                href={`tel:${settings.phone_e164}`}
                className="hover:text-bronze transition-colors"
              >
                {settings.phone_display}
              </a>
            </li>
            {settings.email ? (
              <li className="flex gap-3">
                <Mail className="text-sage mt-0.5 size-4 shrink-0" aria-hidden />
                <a
                  href={`mailto:${settings.email}`}
                  className="hover:text-bronze transition-colors"
                >
                  {settings.email}
                </a>
              </li>
            ) : null}
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

          {bare ? null : (
            <>
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
            </>
          )}
        </div>
      </Container>

      <div className="border-bronze/15 border-t">
        {/* No year here on purpose: a rendered current year forces the page out
            of static prerendering, and a hardcoded one goes stale. */}
        <Container className="text-muted-foreground py-6 text-[13px]">
          © Банний комплекс &amp; Чан «{settings.site_title}». Всі права захищено.
        </Container>
      </div>
    </footer>
  );
}
