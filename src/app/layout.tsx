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
    // suppressHydrationWarning: the head script below writes data-js on
    // this element before hydration, which React otherwise reports as a
    // mismatch — and in development that aborted the admin shell's
    // Suspense boundary and left it stuck on "Перевіряємо доступ…".
    <html
      lang="uk"
      suppressHydrationWarning
      className={`${playfair.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        {/* Before the first paint: the scroll-reveal styles only hide
            anything once this has run, so a visitor without JavaScript
            reads the whole page instead of blank sections. The theme is
            restored here for the same reason — after hydration would be
            a flash of the wrong one. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `document.documentElement.dataset.js="1";` +
              // Before the first paint, so a visitor who chose the light
              // theme never sees the dark one flash past.
              `try{if(localStorage.getItem("bania.theme")==="light")` +
              `document.documentElement.dataset.theme="light"}catch(e){}`,
          }}
        />
      </head>
      {/* Also suppressed here: browser extensions stamp attributes onto
          <body> before React hydrates, and in development that mismatch
          was enough to abandon hydration and leave the admin shell on
          its loading line. */}
      <body
        suppressHydrationWarning
        className="bg-background text-foreground flex min-h-full flex-col font-sans"
      >
        {children}
      </body>
    </html>
  );
}
