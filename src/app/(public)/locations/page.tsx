import type { Metadata } from "next";

import { DbPage } from "@/views/page";

export const metadata: Metadata = {
  title: "Локації та Чан",
  description: "Три автономні зони: дві парні на дровах та чавунний чан просто неба.",
};

export default function Page() {
  return <DbPage slug="locations" />;
}
