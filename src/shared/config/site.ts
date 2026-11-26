/**
 * Single source of truth for site-wide constants.
 *
 * Everything here will eventually move into the `settings` table and become
 * editable from the admin panel (see docs/ADMIN-CONFIGURATION.md). Until then
 * it lives in one file so the move is a single, obvious change.
 */

export const siteConfig = {
  name: "Стара Дорога",
  wordmark: "BATHHOUSE",
  tagline: "Банний комплекс & Чан",
  description:
    "Автентичний відпочинок у комплексі «Стара Дорога»: гарячий чавунний чан на дровах, " +
    "дві парні на дубових дровах, відкритий басейн та крижаний душ-водоспад.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /** Shown in the header, on contacts, and in the booking calendar tooltip. */
  phone: {
    display: "066 123 12 31",
    href: "tel:+380661231231",
  },

  /** Display only. It does not drive availability — see docs/ADMIN-CONFIGURATION.md. */
  openingHoursNote: "Щоденно 09:00 — 23:00",

  /** PLACEHOLDER — taken from the mock-up, not confirmed by the owner. */
  address: "вул. Стара Дорога, 42, Лісове урочище, Київська обл.",

  /** PLACEHOLDER — taken from the mock-up, not confirmed by the owner. */
  email: "welcome@staradoroga.ua",

  /** PLACEHOLDER — taken from the mock-up, not confirmed by the owner. */
  instagram: {
    handle: "@staradoroga",
    href: "https://instagram.com/staradoroga",
  },
} as const;

export const navigation = [
  { href: "/", label: "Головна" },
  { href: "/locations", label: "Локації та Чан" },
  { href: "/pricing", label: "Ціни та пакети" },
  { href: "/gallery", label: "Фотогалерея" },
  { href: "/booking", label: "Календар" },
  { href: "/contacts", label: "Контакти" },
] as const;
