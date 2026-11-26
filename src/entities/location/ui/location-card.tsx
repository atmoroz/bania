import Image from "next/image";
import { Check } from "lucide-react";

import { Card } from "@/shared/ui";
import { formatHryvnia } from "@/shared/lib";

import type { Location } from "../model/types";

export function LocationCard({ location }: { location: Location }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={location.image.src}
          alt={location.image.alt}
          fill
          sizes="(min-width: 1024px) 400px, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <p className="label-caps text-bronze">до {location.capacity} осіб</p>
          <h3 className="font-display mt-3 text-[22px] leading-7">{location.name}</h3>
          <p className="text-muted-foreground mt-3 text-[15px] leading-6">
            {location.description}
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {location.highlights.map((item) => (
            <li key={item} className="flex gap-3 text-[15px] leading-6">
              <Check className="text-sage mt-1 size-4 shrink-0" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <p className="border-bronze/15 mt-auto border-t pt-5 text-[15px]">
          <span className="text-muted-foreground">Вартість</span>{" "}
          <span className="text-bronze font-medium">
            від {formatHryvnia(location.pricePerHour)} / год
          </span>
        </p>
      </div>
    </Card>
  );
}
