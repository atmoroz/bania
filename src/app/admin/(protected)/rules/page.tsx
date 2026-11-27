import { Suspense } from "react";

import { RulesEditor, getAdminRules } from "@/features/admin-rules";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata = { title: "Правила" };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Правила">
        Два вікна під кнопкою бронювання: правила та «що входить». Секції
        показуються в тому порядку, в якому стоять тут; приховані лишаються в
        панелі, але на сайті їх немає.
      </AdminPageHeader>

      <Container className="pt-8 pb-16">

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Rules />
      </Suspense>
      </Container>
    </>
  );
}

async function Rules() {
  const sections = await getAdminRules();
  return <RulesEditor initial={sections} />;
}
