import type { Metadata } from "next";

import { Section, SectionHeading } from "@/shared/ui";

export const metadata: Metadata = { title: "Бронювання", robots: { index: false } };

export default function AdminBookingsPage() {
  return (
    <Section>
      <SectionHeading eyebrow="Адмінпанель" title="Бронювання" />
    </Section>
  );
}
