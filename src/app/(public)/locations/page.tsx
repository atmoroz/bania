import type { Metadata } from "next";

import { LocationsPage } from "@/views/locations";

export const metadata: Metadata = {
  title: "Локації та Чан",
  description: "Три автономні зони: дві парні на дровах та чавунний чан просто неба.",
};

export default function Page() {
  return <LocationsPage />;
}
