import type { Metadata } from "next";

import { DbPage } from "@/views/page";

export const metadata: Metadata = {
  title: "Політика конфіденційності",
  description:
    "Які дані збирає сайт «Стара Дорога» і які не збирає: без трекерів, без реклами, без передачі третім особам.",
};

export default function Page() {
  return <DbPage slug="privacy" />;
}
