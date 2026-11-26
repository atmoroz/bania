import type { Block } from "@/entities/page-block";

import {
  AddonsBlock,
  BookingCtaBlock,
  ContactsBlock,
  GalleryBlock,
  LocationsBlock,
  ReviewsBlock,
  RichTextBlock,
} from "./content-blocks";
import { FeatureGridBlock } from "./feature-grid-block";
import { HeroBlock } from "./hero-block";

/**
 * Renders one block. The switch is exhaustive over the block type union, so
 * adding a type to the schema without a component here is a type error rather
 * than a page that silently misses a section.
 */
function renderBlock(block: Block) {
  switch (block.type) {
    case "hero":
      return <HeroBlock content={block.content} />;
    case "feature_grid":
      return <FeatureGridBlock content={block.content} />;
    case "locations":
      return <LocationsBlock content={block.content} />;
    // Retired type, kept so an old row still renders as the catalogue it became.
    case "packages":
      return <LocationsBlock content={block.content} />;
    case "addons":
      return <AddonsBlock content={block.content} />;
    case "gallery":
      return <GalleryBlock content={block.content} />;
    case "reviews":
      return <ReviewsBlock content={block.content} />;
    case "contacts":
      return <ContactsBlock content={block.content} />;
    case "booking_cta":
      return <BookingCtaBlock content={block.content} />;
    case "rich_text":
      return <RichTextBlock content={block.content} />;
  }
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </>
  );
}
