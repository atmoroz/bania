import { Suspense } from "react";

import { SettingsEditor, getVenueConfig } from "@/features/admin-settings";
import { Container } from "@/shared/ui";

export const metadata = { title: "Налаштування" };

export default function Page() {
  return (
    <Container className="py-14">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[34px] leading-tight md:text-[44px]">
        Налаштування
      </h1>
      <p className="text-muted-foreground mt-4 max-w-[640px] text-[15px] leading-6">
        Усе про сам заклад: телефон, пошта й адреса, години роботи, закриті дати та
        правила, які успадковує кожна локація. Години та перерва керують календарем —
        усе, що тут зміниться, одразу змінює доступні для бронювання години.
      </p>

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Settings />
      </Suspense>
    </Container>
  );
}

async function Settings() {
  const config = await getVenueConfig();
  return <SettingsEditor initial={config} />;
}
