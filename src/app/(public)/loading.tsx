import { Section } from "@/shared/ui";

export default function Loading() {
  return (
    <Section>
      <div className="bg-surface-high h-4 w-40 animate-pulse" />
      <div className="bg-surface-high mt-6 h-10 w-full max-w-xl animate-pulse" />
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surface-container h-80 animate-pulse" />
        ))}
      </div>
    </Section>
  );
}
