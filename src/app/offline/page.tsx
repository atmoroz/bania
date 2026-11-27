import { Phone, WifiOff } from "lucide-react";

import { getSettings } from "@/entities/settings";
import { ButtonLink, Container } from "@/shared/ui";

export const metadata = { title: "Немає зв'язку" };

/**
 * Shown by the service worker when a page is asked for and there is no
 * network.
 *
 * It carries the telephone number and nothing else that could be wrong.
 * The calendar is not here on purpose: free hours cannot be answered from
 * a cache, and a number that still works is more use than a page that
 * lies.
 *
 * Outside the public layout, so it has no navigation to offer links
 * nothing can load.
 */
export default async function OfflinePage() {
  const settings = await getSettings();

  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center py-20 text-center">
      <WifiOff className="text-bronze size-8" aria-hidden />
      <p className="label-caps text-bronze mt-7">{settings.site_title}</p>
      <h1 className="font-display mt-4 text-[32px] leading-tight md:text-[44px]">
        Немає зв&apos;язку
      </h1>
      <p className="text-muted-foreground mt-5 max-w-md text-[15px] leading-6">
        Сторінка не завантажилась — телефон поза мережею. Вільні години ми показуємо
        тільки наживо, тому зачекайте на зв&apos;язок або зателефонуйте: адміністратор
        підкаже час і забронює.
      </p>

      <ButtonLink href={`tel:${settings.phone_e164}`} className="mt-9">
        <Phone className="size-4" aria-hidden />
        {settings.phone_display}
      </ButtonLink>
    </Container>
  );
}
