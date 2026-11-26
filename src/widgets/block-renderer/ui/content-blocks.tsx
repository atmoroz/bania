import { Clock, Mail, MapPin, Navigation, Phone, Star } from "lucide-react";

import { AddonRow, getAddons } from "@/entities/addon";
import { getLocations, LocationCard } from "@/entities/location";
import type { BlockContent } from "@/entities/page-block";
import { getPhotos, PhotoTile } from "@/entities/photo";
import { getReviews, ReviewCard } from "@/entities/review";
import { getSettings } from "@/entities/settings";
import { ButtonLink, Card, Section, SectionHeading } from "@/shared/ui";

export async function LocationsBlock({ content }: { content: BlockContent["locations"] }) {
  const locations = await getLocations();
  return (
    <Section>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <LocationCard key={location.slug} location={location} showPrice={content.showPrices} />
        ))}
      </div>
    </Section>
  );
}

export async function AddonsBlock({ content }: { content: BlockContent["addons"] }) {
  const addons = await getAddons();
  return (
    <Section className="bg-surface-low">
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      <ul className="mt-10 flex flex-col">
        {addons.map((addon) => (
          <AddonRow key={addon.slug} addon={addon} />
        ))}
      </ul>
    </Section>
  );
}

export async function GalleryBlock({ content }: { content: BlockContent["gallery"] }) {
  const photos = await getPhotos();
  return (
    <Section>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <PhotoTile key={photo.id} photo={photo} />
        ))}
      </div>
    </Section>
  );
}

export async function ReviewsBlock({ content }: { content: BlockContent["reviews"] }) {
  const reviews = await getReviews();

  // A slider is a horizontal scroller with snap points: no JavaScript, works on a
  // phone by swiping, and degrades to a plain row on a wide screen.
  const isSlider = content.display === "slider";

  return (
    <Section className="bg-surface-low">
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />

      {content.summaryScore ? (
        <Card className="mt-10 flex items-center gap-5 p-7">
          <Star className="fill-bronze text-bronze size-8 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-[28px] leading-9">
              {content.summaryScore} / {content.summaryOutOf}
            </p>
            {content.summaryNote ? (
              <p className="text-muted-foreground mt-1 text-[13px]">{content.summaryNote}</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div
        className={
          isSlider
            ? "mt-14 -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 md:mx-0 md:px-0"
            : "mt-14 grid gap-8 md:grid-cols-2"
        }
      >
        {reviews.map((review) => (
          <div
            key={review.id}
            className={isSlider ? "w-[85%] shrink-0 snap-start md:w-[48%]" : undefined}
          >
            <ReviewCard review={review} />
          </div>
        ))}
      </div>

      {content.ctaLabel && content.ctaHref ? (
        <ButtonLink href={content.ctaHref} variant="ghost" className="mt-10">
          {content.ctaLabel}
        </ButtonLink>
      ) : null}
    </Section>
  );
}

export async function ContactsBlock({ content }: { content: BlockContent["contacts"] }) {
  const settings = await getSettings();
  return (
    <Section>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Card className="p-7">
          <Phone className="text-bronze size-5" aria-hidden />
          <p className="label-caps text-muted-foreground mt-4">Телефон адміністратора</p>
          <a
            href={`tel:${settings.phone_e164}`}
            className="font-display hover:text-bronze mt-2 block text-[22px] transition-colors"
          >
            {settings.phone_display}
          </a>
          <p className="text-muted-foreground mt-3 text-[13px] leading-5">
            Бронювання підтверджує адміністратор у телефонній розмові.
          </p>
        </Card>

        <Card className="p-7">
          <Clock className="text-bronze size-5" aria-hidden />
          <p className="label-caps text-muted-foreground mt-4">Графік роботи</p>
          <p className="font-display mt-2 text-[22px]">{settings.opening_hours_note}</p>
        </Card>

        {settings.address ? (
          <Card className="p-7">
            <MapPin className="text-bronze size-5" aria-hidden />
            <p className="label-caps text-muted-foreground mt-4">Адреса комплексу</p>
            <p className="mt-2 text-[15px] leading-6">{settings.address}</p>
            {settings.map_url ? (
              <ButtonLink href={settings.map_url} variant="ghost" className="mt-5">
                <Navigation className="size-4" aria-hidden />
                Відкрити карту
              </ButtonLink>
            ) : null}
          </Card>
        ) : null}

        {settings.email ? (
          <Card className="p-7">
            <Mail className="text-bronze size-5" aria-hidden />
            <p className="label-caps text-muted-foreground mt-4">Пошта</p>
            <a
              href={`mailto:${settings.email}`}
              className="hover:text-bronze mt-2 block text-[15px] transition-colors"
            >
              {settings.email}
            </a>
          </Card>
        ) : null}
      </div>
    </Section>
  );
}

export async function BookingCtaBlock({ content }: { content: BlockContent["booking_cta"] }) {
  const [settings, locations] = await Promise.all([getSettings(), getLocations()]);
  return (
    <Section>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />

      <Card className="mt-12 flex flex-col items-start gap-6 p-8 md:p-12">
        <Clock className="text-bronze size-8" aria-hidden />
        <div>
          <h2 className="font-display text-[28px] leading-9">Календар у розробці</h2>
          {content.note ? (
            <p className="text-muted-foreground mt-3 max-w-xl text-[15px] leading-6">
              {content.note}
            </p>
          ) : null}
        </div>
        <ButtonLink href={`tel:${settings.phone_e164}`}>
          <Phone className="size-4" aria-hidden />
          {settings.phone_display}
        </ButtonLink>
      </Card>

      <div className="mt-16">
        <p className="label-caps text-bronze">Що можна забронювати</p>
        <ul className="border-bronze/15 mt-6 flex flex-col border-t">
          {locations.map((l) => (
            <li
              key={l.slug}
              className="border-bronze/15 flex flex-col gap-1 border-b py-5 sm:flex-row sm:items-baseline sm:justify-between"
            >
              <span className="text-[15px]">{l.name}</span>
              {l.capacity ? (
                <span className="text-muted-foreground text-[13px]">до {l.capacity} осіб</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function RichTextBlock({ content }: { content: BlockContent["rich_text"] }) {
  return (
    <Section>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      {content.body ? (
        <p className="text-muted-foreground mt-6 max-w-3xl text-[15px] leading-6 whitespace-pre-line">
          {content.body}
        </p>
      ) : null}
    </Section>
  );
}
