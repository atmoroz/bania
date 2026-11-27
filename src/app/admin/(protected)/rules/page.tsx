import { Suspense } from "react";

import { RulesEditor, getAdminRules } from "@/features/admin-rules";
import { Container } from "@/shared/ui";

export const metadata = { title: "Правила" };

export default function Page() {
  return (
    <Container className="py-14">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[34px] leading-tight md:text-[44px]">Правила</h1>
      <p className="text-muted-foreground mt-4 max-w-[640px] text-[15px] leading-6">
        Те, що гість бачить у вікні «Ознайомитись з правилами» під кнопкою бронювання.
        Секції показуються в цьому порядку; приховані лишаються тут, але на сайті їх
        немає.
      </p>

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Rules />
      </Suspense>
    </Container>
  );
}

async function Rules() {
  const sections = await getAdminRules();
  return <RulesEditor initial={sections} />;
}
