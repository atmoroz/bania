import type { Location } from "@/entities/location";
import type { Block } from "@/entities/page-block";
import type { Photo } from "@/entities/photo";

import {
  AddonsBlock,
  BookingCtaBlock,
  ContactsBlock,
  GalleryBlock,
  LocationsBlock,
  ReviewFormBlock,
  ReviewsBlock,
  RichTextBlock,
} from "./content-blocks";
import { Reveal } from "@/shared/ui";

import { FeatureGridBlock } from "./feature-grid-block";
import { HeroBlock } from "./hero-block";

/**
 * Content the preview route has, which the published page does not: the
 * owner's unsaved catalogue or gallery. Absent on the real site, where
 * every block fetches its own.
 */
export type Staged = { locations?: Location[] | null; photos?: Photo[] | null };

/**
 * Renders one block. The switch is exhaustive over the block type union, so
 * adding a type to the schema without a component here is a type error rather
 * than a page that silently misses a section.
 */
function renderBlock(block: Block, staged: Staged) {
  switch (block.type) {
    case "hero":
      return <HeroBlock content={block.content} />;
    case "feature_grid":
      return <FeatureGridBlock content={block.content} />;
    case "locations":
      return <LocationsBlock content={block.content} staged={staged.locations} />;
    // Retired type, kept so an old row still renders as the catalogue it became.
    // Its schema predates showBooking, so the default is supplied here.
    case "packages":
      return (
        <LocationsBlock
          content={{ ...block.content, showBooking: false }}
          staged={staged.locations}
        />
      );
    case "addons":
      return <AddonsBlock content={block.content} />;
    case "gallery":
      return <GalleryBlock content={block.content} staged={staged.photos} />;
    case "reviews":
      return <ReviewsBlock content={block.content} />;
    case "review_form":
      return <ReviewFormBlock content={block.content} />;
    case "contacts":
      return <ContactsBlock content={block.content} />;
    case "booking_cta":
      return <BookingCtaBlock content={block.content} />;
    case "rich_text":
      return <RichTextBlock content={block.content} />;
  }
}

export function BlockRenderer({ blocks, staged = {} }: { blocks: Block[]; staged?: Staged }) {
  return (
    <>
      {blocks.map((block, index) =>
        // The first block is the one already on screen when the page
        // opens; fading it in would mean the site begins by hiding
        // itself. Everything below arrives as it is scrolled to.
        index === 0 ? (
          <div key={block.id}>{renderBlock(block, staged)}</div>
        ) : (
          <Reveal key={block.id}>{renderBlock(block, staged)}</Reveal>
        ),
      )}
    </>
  );
}
