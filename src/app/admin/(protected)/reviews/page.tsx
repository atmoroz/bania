import { Suspense } from "react";

import { AdminReviewList, getAdminReviews } from "@/features/admin-reviews";
import { Container } from "@/shared/ui";

export const metadata = { title: "Відгуки" };

export default function Page() {
  return (
    <Container className="py-14">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[34px] leading-tight md:text-[44px]">Відгуки</h1>
      <p className="text-muted-foreground mt-4 max-w-[640px] text-[15px] leading-6">
        Нові відгуки з сайту не показуються, доки ви їх не опублікуєте. Оцінки без тексту
        також потребують публікації — вони впливають на середній бал.
      </p>

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <ReviewList />
      </Suspense>
    </Container>
  );
}

async function ReviewList() {
  const reviews = await getAdminReviews();
  return <AdminReviewList reviews={reviews} />;
}
