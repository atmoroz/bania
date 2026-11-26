import { Suspense } from "react";

import { GalleryEditor, getGalleryPhotos } from "@/features/admin-gallery";
import { Container } from "@/shared/ui";

export const metadata = { title: "Галерея" };

export default function Page() {
  return (
    <Container className="py-14">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[34px] leading-tight md:text-[44px]">Галерея</h1>
      <p className="text-muted-foreground mt-4 max-w-[640px] text-[15px] leading-6">
        Фотографії зі сторінки «Фотогалерея», у порядку показу. Зміни тут застосовуються
        одразу. «Прибрати» прибирає плитку з галереї — сам файл залишається в медіатеці.
      </p>

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Gallery />
      </Suspense>
    </Container>
  );
}

async function Gallery() {
  const photos = await getGalleryPhotos();
  return <GalleryEditor initial={photos} />;
}
