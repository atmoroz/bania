import type { Metadata } from "next";

import { DbPage } from "@/views/page";

export const metadata: Metadata = {
  title: "Календар бронювання",
  description: "Вільні та зайняті години. Бронювання підтверджує адміністратор.",
};

export default function Page() {
  return <DbPage slug="booking" />;
}
