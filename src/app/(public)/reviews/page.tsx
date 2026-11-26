import type { Metadata } from "next";

import { DbPage } from "@/views/page";

export const metadata: Metadata = {
  title: "Відгуки",
  description: "Що кажуть гості про відпочинок у банному комплексі.",
};

export default function Page() {
  return <DbPage slug="reviews" />;
}
