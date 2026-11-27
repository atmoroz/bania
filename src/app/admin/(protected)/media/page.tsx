import { Suspense } from "react";

import { MediaManager, getMediaLibrary } from "@/features/admin-media";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata = { title: "Медіа" };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Медіа">
        Усі зображення сайту в одному місці. Звідси їх беруть банер головної, картки
        локацій та фотогалерея — тому файл, який десь використовується, видаляється
        разом із цими місцями, і панель спершу покаже, з якими саме.
      </AdminPageHeader>

      <Container className="pt-8 pb-16">

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Library />
      </Suspense>
      </Container>
    </>
  );
}

async function Library() {
  const items = await getMediaLibrary();
  return <MediaManager initial={items} />;
}
