import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";

import { getSettings } from "@/entities/settings";

import "./globals.css";

// Playfair Display carries headings and ritual names; Manrope carries
// everything operational. Both come from the design spec.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// The installed app's window: the browser's own chrome is gone, so the
// system bar takes this colour and the site's background continues into it.
export const viewport: Viewport = {
  themeColor: "#12100e",
  colorScheme: "dark",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = `${settings.site_title} — Банний комплекс & Чан`;
  const description =
    "Автентичний відпочинок у комплексі «Стара Дорога»: гарячий чавунний чан на дровах, " +
    "дві парні на дубових дровах, відкритий басейн та крижаний душ-водоспад.";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3210"),
    title: { default: title, template: `%s — ${settings.site_title}` },
    description,
    appleWebApp: {
      capable: true,
      title: settings.site_title,
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      type: "website",
      locale: "uk_UA",
      siteName: settings.site_title,
      title,
      description,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${playfair.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
