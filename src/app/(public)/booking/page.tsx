import type { Metadata } from "next";

import { BookingPage } from "@/views/booking";

export const metadata: Metadata = {
  title: "Календар бронювання",
  description: "Вільні та зайняті години. Бронювання підтверджує адміністратор.",
};

export default function Page() {
  return <BookingPage />;
}
