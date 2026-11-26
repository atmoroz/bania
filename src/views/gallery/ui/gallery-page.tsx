import { photos, PhotoTile } from "@/entities/photo";
import { siteConfig } from "@/shared/config/site";
import { Section, SectionHeading } from "@/shared/ui";

export function GalleryPage() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Атмосфера та деталі"
        title={`Фотогалерея простору «${siteConfig.name}»`}
        lead={`Більше фото в Instagram ${siteConfig.instagram.handle}`}
      />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <PhotoTile key={photo.id} photo={photo} />
        ))}
      </div>
    </Section>
  );
}
