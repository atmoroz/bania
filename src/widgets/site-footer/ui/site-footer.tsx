import Link from "next/link";
import { Check, Clock, Mail, MapPin, Phone } from "lucide-react";

import { getLocations } from "@/entities/location";
import { getNavigation } from "@/entities/page-block";
import { getSettings, getSocialLinks, SocialBadge, socialLabel } from "@/entities/settings";
import { Container, LogoMark } from "@/shared/ui";

const etiquette = [
  "Власна купіль та крижаний басейн",
  "Трав’яні збори та дубові віники",
];

/**
 * The minimum, said once and taken from the cards.
 *
 * It used to be the fixed line "Оренда банного простору від 2 годин" in
 * the footer of all six pages, which stopped being true the day the chan
 * and the set asked for three.
 */
function minimumLine(locations: { acceptsBookings: boolean; minimumMinutes: number }[]): string {
  const hours = [
    ...new Set(
      locations.filter((l) => l.acceptsBookings).map((l) => Math.round(l.minimumMinutes / 60)),
    ),
  ].sort((a, b) => a - b);

  const low = hours[0];
  const high = hours[hours.length - 1];
  if (low === undefined || high === undefined) return "Бронювання від 2 годин";
  return low === high
    ? `Бронювання від ${low} годин`
    : `Бронювання від ${low} годин, чан і сет — від ${high}`;
}

/** `bare` drops the section links, for the preview: see SiteHeaderClient. */
export async function SiteFooter({ bare = false }: { bare?: boolean } = {}) {
  const [settings, navigation, social, locations] = await Promise.all([
    getSettings(),
    getNavigation(),
    getSocialLinks(),
    getLocations(),
  ]);

  const lines = [minimumLine(locations), ...etiquette];

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
          {/* Every network the venue is on, in the order the owner put
              them, each with its own mark. One list from the database
              rather than a column and an icon chosen in the markup. */}
          {social.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-3">
              {social.map((link) => {
                const name = link.label ?? socialLabel[link.kind];
                return (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      title={name}
                      className="group/social block"
                    >
                      <SocialBadge kind={link.kind} />
                    </a>
                  </li>
                );
              })}
            </ul>
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

          <p className="label-caps text-bronze mt-8">Прямий зв’язок</p>
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
            {lines.map((line) => (
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
