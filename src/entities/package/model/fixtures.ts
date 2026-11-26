import type { Package } from "./types";

/** FIXTURE DATA — from the owner's design. Replaced by the `prices` table. */
export const packages: readonly Package[] = [
  {
    slug: "banya",
    eyebrow: "Традиційний пар",
    name: "Баня на дровах",
    summary: "Оренда Бані #1 або Бані #2 для сім'ї або компанії.",
    pricePerHour: 60_000,
    minimumHours: 2,
    includes: [
      "До 6 осіб включно (дод. гість +100 ₴/год)",
      "Басейн або водоспад «Ніагара»",
      "Чайник духмяного карпатського чаю",
      "Шапочки та простирадла для кожного гостя",
    ],
    ctaLabel: "Забронювати лазню",
    featured: false,
  },
  {
    slug: "banya-chan",
    eyebrow: "Повний релакс",
    name: "Баня + Чан на дровах",
    summary: "Одночасне користування гарячим чаном та парною.",
    pricePerHour: 130_000,
    minimumHours: 2,
    includes: [
      "До 8 осіб у вартість пакету",
      "Гарячий чан з хвоєю та річковим камінням",
      "Прогрів у парній + купання в басейні",
      "Трав'яний збір, липовий мед та банний текстиль",
    ],
    ctaLabel: "Обрати комбо-пакет",
    featured: true,
  },
  {
    slug: "chan",
    eyebrow: "Окремий чан",
    name: "Чавунний Чан з хвоєю",
    summary: "Купання просто неба у чавунному казані над багаттям.",
    pricePerHour: 80_000,
    minimumHours: 2,
    includes: [
      "До 6 осіб місткість чану",
      "Свіжа смерекова хвоя та ароматрави",
      "Тераса з кріслом-гойдалкою та стіл",
      "Душова та переодягальня",
    ],
    ctaLabel: "Забронювати чан",
    featured: false,
  },
] as const;
