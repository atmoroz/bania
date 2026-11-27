import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminBookingCalendar } from "@/features/admin-bookings";
import { createSupabaseServerClient } from "@/shared/api";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata: Metadata = { title: "Бронювання", robots: { index: false } };

export default function AdminBookingsPage() {
  return (
    <>
      <AdminPageHeader title="Бронювання">
        Сьогоднішній день відкрито одразу. Підтвердіть або скасуйте очікувані броні,
        або створіть нову для гостя, який зателефонував.
      </AdminPageHeader>

      <Container className="pt-8 pb-16">
        <Suspense fallback={<p className="text-muted-foreground text-[15px]">Завантаження…</p>}>
          <Loader />
        </Suspense>
      </Container>
    </>
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
