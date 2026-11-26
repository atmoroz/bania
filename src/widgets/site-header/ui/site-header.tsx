import { getNavigation } from "@/entities/page-block";
import { getSettings } from "@/entities/settings";

import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const [settings, navigation] = await Promise.all([getSettings(), getNavigation()]);

  return (
    <SiteHeaderClient
      wordmark={settings.wordmark}
      siteTitle={settings.site_title}
      phoneDisplay={settings.phone_display}
      phoneHref={`tel:${settings.phone_e164}`}
      navigation={navigation}
    />
  );
}
