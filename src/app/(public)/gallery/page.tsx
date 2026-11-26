import type { Metadata } from "next";

import { DbPage } from "@/views/page";

export const metadata: Metadata = {
  title: "Фотогалерея",
  description: "Парні, чавунний чан, тераса та басейн банного комплексу.",
};

export default function Page() {
  return <DbPage slug="gallery" />;
}
