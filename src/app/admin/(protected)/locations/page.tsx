import { Suspense } from "react";

import { RoomsEditor, getAdminRooms } from "@/features/admin-rooms";
import { Container } from "@/shared/ui";

export const metadata = { title: "Локації" };

export default function Page() {
  return (
    <Container className="py-14">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[34px] leading-tight md:text-[44px]">Локації</h1>
      <p className="text-muted-foreground mt-4 max-w-[640px] text-[15px] leading-6">
        Картки каталогу: зони, сети з них і все, що на картці видно — фотографії, ціна,
        місткість, переваги. Картки не видаляються: на них можуть посилатися вже
        прийняті бронювання, тож зона, якої більше немає, просто ховається.
      </p>

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Catalogue />
      </Suspense>
    </Container>
  );
}

async function Catalogue() {
  const rooms = await getAdminRooms();
  return <RoomsEditor initial={rooms} />;
}
