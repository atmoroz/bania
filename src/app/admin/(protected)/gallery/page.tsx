import { Suspense } from "react";

import { GalleryEditor, getGalleryPhotos } from "@/features/admin-gallery";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata = { title: "Галерея" };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Галерея">
        Фотографії зі сторінки «Фотогалерея», у порядку показу. Зміни тут застосовуються
        одразу. «Прибрати» прибирає плитку з галереї — сам файл залишається в медіатеці.
      </AdminPageHeader>

      <Container className="pt-8 pb-16">

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Gallery />
      </Suspense>
      </Container>
    </>
  );
}

async function Gallery() {
  const photos = await getGalleryPhotos();
  return <GalleryEditor initial={photos} />;
}
