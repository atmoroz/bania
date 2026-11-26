import { Check } from "lucide-react";

import { ButtonLink, Card } from "@/shared/ui";
import { cn, formatHryvnia } from "@/shared/lib";

import type { Package } from "../model/types";

export function PackageCard({ item }: { item: Package }) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-6 p-7",
        item.featured && "border-bronze bg-sage-deep/30",
      )}
    >
      <div>
        <p className="label-caps text-bronze">{item.eyebrow}</p>
        <h3 className="font-display mt-3 text-[22px] leading-7">{item.name}</h3>
        <p className="text-muted-foreground mt-3 text-[15px] leading-6">{item.summary}</p>
      </div>

      <div className="border-bronze/15 border-y py-5">
        <p className="font-display text-[32px] leading-10">
          {formatHryvnia(item.pricePerHour)}
          <span className="text-muted-foreground font-sans text-[13px]"> / 1 година</span>
        </p>
        <p className="text-muted-foreground mt-1 text-[13px]">
          Мінімальне замовлення — {item.minimumHours} години
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {item.includes.map((line) => (
          <li key={line} className="flex gap-3 text-[15px] leading-6">
            <Check className="text-sage mt-1 size-4 shrink-0" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <ButtonLink
        href="/booking"
        variant={item.featured ? "primary" : "ghost"}
        className="mt-auto w-full"
      >
        {item.ctaLabel}
      </ButtonLink>
    </Card>
  );
}
