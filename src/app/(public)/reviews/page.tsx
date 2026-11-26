import type { Metadata } from "next";

import { ReviewsPage } from "@/views/reviews";

export const metadata: Metadata = {
  title: "Відгуки",
  description: "Що кажуть гості про відпочинок у банному комплексі.",
};

export default function Page() {
  return <ReviewsPage />;
}
