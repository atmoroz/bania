"use client";

import { Button, Section, SectionHeading } from "@/shared/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Section>
      <SectionHeading
        eyebrow="Помилка"
        title="Щось пішло не так"
        lead="Сторінку не вдалося показати. Спробуйте ще раз або зателефонуйте адміністратору."
      />
      <Button onClick={reset} className="mt-10">
        Спробувати ще раз
      </Button>
    </Section>
  );
}
