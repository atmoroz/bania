import { Suspense } from "react";

import { AdminReviewList, getAdminReviews } from "@/features/admin-reviews";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata = { title: "Відгуки" };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Відгуки">
        Нові відгуки з сайту не показуються, доки ви їх не опублікуєте. Оцінки без тексту
        також потребують публікації — вони впливають на середній бал.
      </AdminPageHeader>

      <Container className="pt-8 pb-16">

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <ReviewList />
      </Suspense>
      </Container>
    </>
  );
}

async function ReviewList() {
  const reviews = await getAdminReviews();
  return <AdminReviewList reviews={reviews} />;
}
