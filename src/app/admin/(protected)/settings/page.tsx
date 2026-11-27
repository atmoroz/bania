import { Suspense } from "react";

import { SettingsEditor, getVenueConfig } from "@/features/admin-settings";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata = { title: "Налаштування" };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Налаштування">
        Усе про сам заклад: телефон, пошта й адреса, години роботи, закриті дати та
        правила, які успадковує кожна локація. Години та перерва керують календарем —
        усе, що тут зміниться, одразу змінює доступні для бронювання години.
      </AdminPageHeader>

      <Container className="pt-8 pb-16">

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Settings />
      </Suspense>
      </Container>
    </>
  );
}

async function Settings() {
  const config = await getVenueConfig();
  return <SettingsEditor initial={config} />;
}
