import { Suspense } from "react";
import { Clock, Mail, MapPin, Navigation, Phone, Star } from "lucide-react";

import { AddonRow, getAddons } from "@/entities/addon";
import { getLocations, LocationCard, type Location } from "@/entities/location";
import type { BlockContent } from "@/entities/page-block";
import { getPhotos, PhotoTile, type Photo } from "@/entities/photo";
import { getReviews, ReviewCard, summarise, writtenOnly } from "@/entities/review";
import { ReviewForm } from "@/features/review-submit";
import { getSettings } from "@/entities/settings";
import { BookingCalendar } from "@/features/booking-hold";
import { ButtonLink, Card, Section, SectionHeading } from "@/shared/ui";

export async function LocationsBlock({
  content,
  staged,
}: {
  content: BlockContent["locations"];
  /** Unsaved cards from the panel, when this is a preview. */
  staged?: Location[] | null;
}) {
  const locations = staged ?? (await getLocations());
  return (
    <Section>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <LocationCard
            key={location.slug}
            location={location}
            showPrice={content.showPrices}
            showBooking={content.showBooking}
          />
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

export async function GalleryBlock({
  content,
  staged,
}: {
  content: BlockContent["gallery"];
  staged?: Photo[] | null;
}) {
  const photos = staged ?? (await getPhotos());
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
  const written = writtenOnly(reviews);
  const summary = summarise(reviews);

  // A slider is a horizontal scroller with snap points: no JavaScript, works on a
  // phone by swiping, and degrades to a plain row on a wide screen.
  const isSlider = content.display === "slider";

  return (
    <Section className="bg-surface-low">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.title}
        lead={content.lead}
        // The page is long and the form sits at the bottom of it; without this
        // the only way to find it is to scroll past every review.
        action={
          <ButtonLink href="#review-form">{content.writeLabel ?? "Залишити відгук"}</ButtonLink>
        }
      />

      {/* The score is counted, not typed in. It includes ratings left without
          a review, which are most of them, so the number matches what people
          actually said rather than what was last written into the block. */}
      {summary.average !== null ? (
        <Card className="mt-10 flex items-center gap-5 p-7">
          <Star className="fill-bronze text-bronze size-8 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-[28px] leading-9">
              {summary.average.toFixed(1).replace(".", ",")} / 5
            </p>
            <p className="text-muted-foreground mt-1 text-[13px]">
              {ratingCountLabel(summary.count)} на цьому сайті
            </p>
            {/* The owner's own line, kept apart from the counted figure: it
                often refers to other places, and running the two together
                would read as one claim about the same number. */}
            {content.summaryNote ? (
              <p className="text-muted-foreground/70 mt-1 text-[12px]">{content.summaryNote}</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {written.length > 0 ? (
        <div
          className={
            isSlider
              ? "mt-14 -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 md:mx-0 md:px-0"
              : "mt-14 grid gap-8 md:grid-cols-2"
          }
        >
          {written.map((review) => (
            <div
              key={review.id}
              className={isSlider ? "w-[85%] shrink-0 snap-start md:w-[48%]" : undefined}
            >
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      ) : null}

      {content.ctaLabel && content.ctaHref ? (
        <ButtonLink href={content.ctaHref} variant="ghost" className="mt-10">
          {content.ctaLabel}
        </ButtonLink>
      ) : null}
    </Section>
  );
}

/** Ukrainian counts three ways: 1 оцінка, 2 оцінки, 5 оцінок. */
function ratingCountLabel(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} оцінок`;
  if (last === 1) return `${count} оцінка`;
  if (last >= 2 && last <= 4) return `${count} оцінки`;
  return `${count} оцінок`;
}

export function ReviewFormBlock({ content }: { content: BlockContent["review_form"] }) {
  return (
    <Section id="review-form" className="scroll-mt-24">
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />
      <div className="mt-12 max-w-[640px]">
        <ReviewForm />
        {content.note ? (
          <p className="text-muted-foreground mt-6 text-[13px] leading-5">{content.note}</p>
        ) : null}
      </div>
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

  // Only cards that actually take bookings. A card can be visible and still be
  // closed for the season, and offering it here would waste a visitor's time.
  const bookable = locations.map((l) => ({
    slug: l.slug,
    name: l.name,
    pricePerHour: l.pricePerHour,
  }));

  return (
    <Section>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lead={content.lead} />

      {/* The calendar reads ?room= to preselect, which is request-time data;
          Cache Components needs it behind a boundary so the rest of the page
          can still be prerendered. */}
      <div className="mt-14">
        <Suspense fallback={<p className="text-muted-foreground text-[15px]">Завантаження…</p>}>
          <BookingCalendar
            rooms={bookable}
            phoneDisplay={settings.phone_display}
            phoneHref={`tel:${settings.phone_e164}`}
          />
        </Suspense>
      </div>

      {content.note ? (
        <Card className="mt-14 flex flex-col items-start gap-5 p-7">
          <Phone className="text-bronze size-6" aria-hidden />
          <p className="text-muted-foreground max-w-xl text-[15px] leading-6">{content.note}</p>
          <ButtonLink href={`tel:${settings.phone_e164}`} variant="ghost">
            {settings.phone_display}
          </ButtonLink>
        </Card>
      ) : null}
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
