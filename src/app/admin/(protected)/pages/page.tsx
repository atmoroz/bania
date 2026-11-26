import { Suspense } from "react";

import { getAdminPages, PageEditor } from "@/features/admin-pages";
import { Container } from "@/shared/ui";

export const metadata = { title: "Сторінки" };

export default function Page() {
  return (
    <Container className="py-14">
      <p className="label-caps text-bronze">Адмінпанель</p>
      <h1 className="font-display mt-3 text-[34px] leading-tight md:text-[44px]">Сторінки</h1>
      <p className="text-muted-foreground mt-4 max-w-[640px] text-[15px] leading-6">
        Кожна сторінка складається з блоків. Відкрийте блок, щоб змінити тексти, приховайте
        той, що зараз не потрібен, або змініть їхній порядок. Зміни видно на сайті одразу.
      </p>

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Editor />
      </Suspense>
    </Container>
  );
}

async function Editor() {
  const pages = await getAdminPages();
  return <PageEditor pages={pages} />;
}
