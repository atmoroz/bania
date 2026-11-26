import Image from "next/image";

import type { Photo } from "../model/types";

export function PhotoTile({ photo }: { photo: Photo }) {
  return (
    <figure className="group border-bronze/15 relative aspect-[4/5] overflow-hidden border">
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      {/* Radial vignette, as the design calls for: steam shadow, not a shadow box. */}
      <figcaption className="from-surface-lowest/95 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-5 pt-16">
        {photo.title ? (
          <p className="font-display text-[18px] leading-6">{photo.title}</p>
        ) : null}
        {photo.caption ? (
          <p className="text-muted-foreground mt-1 text-[13px]">{photo.caption}</p>
        ) : null}
      </figcaption>
    </figure>
  );
}
