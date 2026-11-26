import type { Metadata } from "next";

import { ContactsPage } from "@/views/contacts";

export const metadata: Metadata = {
  title: "Контакти",
  description: "Адреса, телефон адміністратора та графік роботи комплексу.",
};

export default function Page() {
  return <ContactsPage />;
}
