import { Suspense } from "react";

import { getAdminPages, PageEditor } from "@/features/admin-pages";
import { AdminPageHeader, Container } from "@/shared/ui";

export const metadata = { title: "Сторінки" };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Сторінки">
        Кожна сторінка складається з блоків. Відкрийте блок, щоб змінити тексти, приховайте
        той, що зараз не потрібен, або змініть їхній порядок. Зміни не потрапляють на сайт,
        доки ви не натиснете «Зберегти» — спершу їх можна подивитися кнопкою «Переглянути».
      </AdminPageHeader>

      <Container className="pt-8 pb-16">

      <Suspense fallback={<p className="text-muted-foreground mt-10 text-[15px]">Завантаження…</p>}>
        <Editor />
      </Suspense>
      </Container>
    </>
  );
}

async function Editor() {
  const pages = await getAdminPages();
  return <PageEditor pages={pages} />;
}
