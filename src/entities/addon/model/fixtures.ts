import type { Addon } from "./types";

/** FIXTURE DATA — from the owner's design. */
export const addons: readonly Addon[] = [
  {
    slug: "parmeister",
    name: "Послуги пармейстера",
    description: "Індивідуальне пропарювання дубовими віниками (40 хв)",
    price: 120_000,
    unit: "",
  },
  {
    slug: "honey-peeling",
    name: "Медово-сольовий пілінг",
    description: "Скрабування натуральним карпатським медом і морською сіллю",
    price: 85_000,
    unit: "",
  },
  {
    slug: "venik",
    name: "Віник дубовий / березовий",
    description: "Свіжозапарений, з щільною густою кроною",
    price: 15_000,
    unit: "/ шт",
  },
  {
    slug: "grill",
    name: "Оренда мангалу та вугілля",
    description: "Мангал, решітка, шампури та мішок дубового вугілля",
    price: 30_000,
    unit: "/ сет",
  },
] as const;
