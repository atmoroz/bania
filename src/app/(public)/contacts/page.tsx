import type { Metadata } from "next";

import { DbPage } from "@/views/page";

export const metadata: Metadata = {
  title: "Контакти",
  description: "Адреса, телефон адміністратора та графік роботи комплексу.",
};

export default function Page() {
  return <DbPage slug="contacts" />;
}
