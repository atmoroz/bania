import type { Metadata } from "next";

import { DbPage } from "@/views/page";

export const metadata: Metadata = {
  title: "Ціни та пакети",
  description: "Вартість оренди бані та чану, комплексні сети й додаткові послуги.",
};

export default function Page() {
  return <DbPage slug="pricing" />;
}
