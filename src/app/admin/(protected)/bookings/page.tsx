import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminBookingCalendar } from "@/features/admin-bookings";
import { createSupabaseServerClient } from "@/shared/api";
import { Section, SectionHeading } from "@/shared/ui";

export const metadata: Metadata = { title: "Бронювання", robots: { index: false } };

export default function AdminBookingsPage() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Адмінпанель"
        title="Бронювання"
        lead="Сьогоднішній день відкрито одразу. Підтвердіть або скасуйте очікувані броні, або створіть нову для гостя, який зателефонував."
      />
      <div className="mt-12">
        <Suspense fallback={<p className="text-muted-foreground text-[15px]">Завантаження…</p>}>
          <Loader />
        </Suspense>
      </div>
    </Section>
  );
}

async function Loader() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("rooms")
    .select("slug, name")
    .eq("accepts_bookings", true)
    .order("sort_order");

  return <AdminBookingCalendar rooms={data ?? []} />;
}
