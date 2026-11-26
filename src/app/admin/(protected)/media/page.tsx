import { Suspense } from "react";

import { MediaManager, getMediaLibrary } from "@/features/admin-media";
import { Container } from "@/shared/ui";

export const metadata = { title: "Медіа" };

export default function Page() {
  return (
    <Container className="py-14">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[34px] leading-tight md:text-[44px]">Медіа</h1>
      <p className="text-muted-foreground mt-4 max-w-[640px] text-[15px] leading-6">
        Усі зображення сайту в одному місці. Звідси їх беруть банер головної, картки
        локацій та фотогалерея — тому файл, який десь використовується, видаляється
        разом із цими місцями, і панель спершу покаже, з якими саме.
      </p>

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Library />
      </Suspense>
    </Container>
  );
}

async function Library() {
  const items = await getMediaLibrary();
  return <MediaManager initial={items} />;
}
