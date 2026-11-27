import type { MetadataRoute } from "next";

import { getSettings } from "@/entities/settings";

/**
 * The web app manifest, which is what lets the site be installed.
 *
 * The name comes from the database like everything else the owner can
 * change. `start_url` is the home page rather than the calendar: the
 * installed app opens where the site opens.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();

  return {
    name: `${settings.site_title} — баня, чан, басейн`,
    short_name: settings.site_title,
    description:
      "Автентичний відпочинок: гарячий чан на дровах, парні, відкритий басейн. " +
      "Вільні години та бронювання за телефоном.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "uk",
    dir: "ltr",
    background_color: "#12100e",
    theme_color: "#12100e",
    categories: ["lifestyle", "health", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
