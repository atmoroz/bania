import { Suspense } from "react";

import { AddonsEditor, getAdminAddons } from "@/features/admin-addons";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata = { title: "Додаткові послуги" };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Додаткові послуги">
        Віники, аромати, запарки, доглядові дрібниці та текстиль — усе, що продається
        окремо від години. Порядок тут — порядок на сторінці цін; група показується
        там, де стоїть її перша позиція.
      </AdminPageHeader>

      <Container className="pt-8 pb-16">

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Addons />
      </Suspense>
      </Container>
    </>
  );
}

async function Addons() {
  const addons = await getAdminAddons();
  return <AddonsEditor initial={addons} />;
}
