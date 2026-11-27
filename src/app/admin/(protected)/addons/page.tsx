import { Suspense } from "react";

import { AddonsEditor, getAdminAddons } from "@/features/admin-addons";
import { Container } from "@/shared/ui";

export const metadata = { title: "Додаткові послуги" };

export default function Page() {
  return (
    <Container className="py-14">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[34px] leading-tight md:text-[44px]">
        Додаткові послуги
      </h1>
      <p className="text-muted-foreground mt-4 max-w-[640px] text-[15px] leading-6">
        Віники, аромати, запарки, доглядові дрібниці та текстиль — усе, що продається
        окремо від години. Порядок тут — порядок на сторінці цін; група показується
        там, де стоїть її перша позиція.
      </p>

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Addons />
      </Suspense>
    </Container>
  );
}

async function Addons() {
  const addons = await getAdminAddons();
  return <AddonsEditor initial={addons} />;
}
