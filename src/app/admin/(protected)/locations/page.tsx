import { Suspense } from "react";

import { RoomsEditor, getAdminRooms, getVenueMinimumMinutes } from "@/features/admin-rooms";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata = { title: "Локації" };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Локації">
        Картки каталогу: зони, сети з них і все, що на картці видно — фотографії, ціна,
        місткість, переваги. Картку можна видалити, доки за нею немає бронювань і вона
        не входить до складу сету; інакше кошик неактивний і підкаже, що саме її тримає
        — таку зону ховають, а не видаляють.
      </AdminPageHeader>

      <Container className="pt-8 pb-16">

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Catalogue />
      </Suspense>
      </Container>
    </>
  );
}

async function Catalogue() {
  const [rooms, venueMinimum] = await Promise.all([getAdminRooms(), getVenueMinimumMinutes()]);
  return <RoomsEditor initial={rooms} venueMinimum={venueMinimum} />;
}
