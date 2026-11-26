import Image from "next/image";
import { Check } from "lucide-react";

import { cn, formatHryvnia } from "@/shared/lib";
import { ButtonLink, Card } from "@/shared/ui";

import type { Location } from "../model/types";

export function LocationCard({
  location,
  showPrice = true,
  showBooking = false,
}: {
  location: Location;
  showPrice?: boolean;
  showBooking?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        location.isFeatured && "border-bronze",
      )}
    >
      {location.image ? (
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={location.image.src}
            alt={location.image.alt}
            fill
            sizes="(min-width: 1024px) 400px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <p className="label-caps text-bronze">
            {location.capacity ? `до ${location.capacity} осіб` : location.eyebrow}
          </p>
          <h3 className="font-display mt-3 text-[22px] leading-7">{location.name}</h3>

          {location.partOf.length > 0 ? (
            <p className="text-sage mt-2 text-[13px]">
              Включає: {location.partOf.join(" + ")}
            </p>
          ) : null}

          {location.description ? (
            <p className="text-muted-foreground mt-3 text-[15px] leading-6">
              {location.description}
            </p>
          ) : null}
        </div>

        {location.highlights.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {location.highlights.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-6">
                <Check className="text-sage mt-1 size-4 shrink-0" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {showPrice && location.pricePerHour !== null ? (
          <p className="border-bronze/15 mt-auto border-t pt-5 text-[15px]">
            <span className="text-muted-foreground">Вартість</span>{" "}
            <span className="text-bronze font-medium">
              від {formatHryvnia(location.pricePerHour)} / год
            </span>
            <span className="text-muted-foreground block text-[13px]">
              мінімальне замовлення — {location.minimumHours} год
            </span>
          </p>
        ) : null}

        {/* Carries the room in the link so the calendar opens on the one that
            was clicked, rather than making the visitor choose it twice. */}
        {showBooking ? (
          <ButtonLink
            href={`/booking?room=${encodeURIComponent(location.slug)}`}
            className={cn("w-full justify-center", showPrice ? "mt-5" : "mt-auto")}
          >
            Забронювати
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}
