import type { BlockType } from "@/entities/page-block";

/**
 * What the owner sees when editing a block.
 *
 * A description of the fields rather than a form per block type. Ten types
 * with hand-written forms would be ten places to forget a field when the
 * schema changes; this is one list each, next to the labels, in the language
 * the owner reads.
 *
 * It is deliberately *not* derived from the zod schema. Introspecting zod
 * would give field names and types but no labels, no order and no idea that
 * `lead` wants a textarea while `title` wants one line — all the things that
 * make the difference between an editor and a JSON box.
 */
export type Field =
  | { kind: "text"; name: string; label: string; hint?: string }
  | { kind: "textarea"; name: string; label: string; rows?: number; hint?: string }
  | { kind: "switch"; name: string; label: string; hint?: string }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { kind: "cta"; name: string; label: string }
  | { kind: "stats"; name: string; label: string; hint?: string }
  | { kind: "features"; name: string; label: string; hint?: string };

const heading: Field[] = [
  { kind: "text", name: "eyebrow", label: "Надзаголовок" },
  { kind: "text", name: "title", label: "Заголовок" },
  { kind: "textarea", name: "lead", label: "Опис", rows: 3 },
];

export const blockFields: Record<BlockType, Field[]> = {
  hero: [
    ...heading,
    { kind: "text", name: "backgroundMediaPath", label: "Тло (файл у сховищі)" },
    { kind: "cta", name: "primaryCta", label: "Головна кнопка" },
    { kind: "cta", name: "secondaryCta", label: "Друга кнопка" },
    {
      kind: "stats",
      name: "stats",
      label: "Показники",
      hint: "Температури й інші цифри під банером. Кожен можна приховати окремо.",
    },
  ],
  feature_grid: [
    ...heading,
    { kind: "features", name: "items", label: "Пункти", hint: "Кожен можна приховати окремо." },
  ],
  locations: [
    ...heading,
    { kind: "switch", name: "showPrices", label: "Показувати ціни" },
    {
      kind: "switch",
      name: "showBooking",
      label: "Кнопка «Забронювати» на картках",
      hint: "Відкриває календар одразу на цій локації.",
    },
  ],
  addons: heading,
  gallery: heading,
  reviews: [
    ...heading,
    {
      kind: "select",
      name: "display",
      label: "Вигляд",
      options: [
        { value: "grid", label: "Сітка" },
        { value: "slider", label: "Слайдер" },
      ],
    },
    { kind: "text", name: "writeLabel", label: "Напис на кнопці «Залишити відгук»" },
    {
      kind: "text",
      name: "summaryNote",
      label: "Примітка під оцінкою",
      hint: "Середній бал рахується з реальних відгуків і тут не задається. Ця примітка показується окремо від нього.",
    },
    { kind: "text", name: "ctaLabel", label: "Напис на нижньому посиланні" },
    { kind: "text", name: "ctaHref", label: "Адреса нижнього посилання" },
  ],
  contacts: heading,
  review_form: [...heading, { kind: "textarea", name: "note", label: "Примітка під формою", rows: 2 }],
  booking_cta: [...heading, { kind: "textarea", name: "note", label: "Примітка", rows: 3 }],
  rich_text: [...heading, { kind: "textarea", name: "body", label: "Текст", rows: 8 }],
  // Retired type. An old row can still be opened and read, but there is nothing
  // here worth encouraging anyone to edit.
  packages: heading,
};

/** What the owner should see instead of a database identifier. */
export const blockTypeLabel: Record<BlockType, string> = {
  hero: "Банер",
  feature_grid: "Сітка переваг",
  locations: "Локації",
  addons: "Додаткові послуги",
  gallery: "Фотогалерея",
  reviews: "Відгуки",
  contacts: "Контакти",
  review_form: "Форма відгуку",
  booking_cta: "Календар бронювання",
  rich_text: "Текстовий блок",
  packages: "Пакети (застарілий)",
};
