import { Flame, Leaf, Home as HomeIcon } from "lucide-react";

import { Section, SectionHeading } from "@/shared/ui";

const pillars = [
  {
    icon: Flame,
    title: "Чавунний чан просто неба",
    text:
      "Масивний чавунний котел, підігрітий відкритим багаттям. Дно вистелене " +
      "гладким річковим камінням, а вода насичена свіжою смерековою хвоєю та " +
      "лісовими зборами.",
  },
  {
    icon: HomeIcon,
    title: "Дві окремі парні на вибір",
    text:
      "Баня #1 з просторою заскленою терасою та басейном для компаній, або " +
      "Баня #2 «Ніагара» з потужним душем-водоспадом для цінителів інтенсивного " +
      "контрасту.",
  },
  {
    icon: Leaf,
    title: "Віники та карпатські трав'яні чаї",
    text:
      "Свіжі дубові та березові вінички для пропарювання, натуральний мед із " +
      "пасіки та запашні настої з м'яти, липи, чебрецю й материнки, заварені " +
      "в самоварі.",
  },
];

export function Philosophy() {
  return (
    <Section className="bg-surface-low">
      <SectionHeading
        eyebrow="Ритуал • Відновлення • Спокій"
        title="Живий вогонь та справжня м'яка пара"
        lead="Ми відродили первісний дух оздоровлення, де кожна деталь підпорядкована природному балансу. Ніяких електричних тенів — виключно відбірні дубові поліна, розпечений жадеїт та пахуча хвоя, що віддають тепло повільно та шляхетно."
      />

      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article key={pillar.title}>
            <pillar.icon className="text-bronze size-6" aria-hidden />
            <h3 className="font-display mt-5 text-[22px] leading-7">{pillar.title}</h3>
            <p className="text-muted-foreground mt-3 text-[15px] leading-6">{pillar.text}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
