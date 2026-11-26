import type { Metadata } from "next";

import { GalleryPage } from "@/views/gallery";

export const metadata: Metadata = {
  title: "Фотогалерея",
  description: "Парні, чавунний чан, тераса та басейн банного комплексу.",
};

export default function Page() {
  return <GalleryPage />;
}
