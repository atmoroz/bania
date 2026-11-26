import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getStagedCatalogue, getStagedGallery } from "@/features/admin-preview";
import { getPreviewBlocks } from "@/features/admin-pages";
import { getAdmin } from "@/shared/api";
import { Container } from "@/shared/ui";
import { BlockRenderer } from "@/widgets/block-renderer";
import { SiteFooter } from "@/widgets/site-footer";
import { SiteHeader } from "@/widgets/site-header";

export const metadata = { title: "Попередній перегляд", robots: { index: false, follow: false } };

/**
 * The page as it would be if the unpublished edits were published.
 *
 * Deliberately outside the /admin route group: it has to carry the public
 * header and footer, because a preview that does not look like the page is
 * not a preview. It is still administrator-only — the guard below is the same
 * one the admin area uses, not a weaker check that happens to be nearby.
 */
export default function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  // The promise is handed down rather than awaited here: params is
  // request-time data, and Cache Components requires it to be read inside a
  // boundary so the rest of the route can still be prerendered.
  return (
    <Suspense fallback={null}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  // The home page's slug is empty, which cannot be a path segment.
  const slug = raw === "home" ? "" : raw;

  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  // Three sources of "not yet published", resolved together: the page's own
  // blocks, and whatever the catalogue and gallery editors have staged.
  const [blocks, locations, photos] = await Promise.all([
    getPreviewBlocks(slug),
    getStagedCatalogue(),
    getStagedGallery(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Stated plainly and kept on screen: the one thing that must never
          happen is mistaking this for the live site and assuming the change
          has already gone out. */}
      <div className="bg-bronze text-primary-foreground sticky top-0 z-50">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="label-caps">Попередній перегляд · на сайті цих змін ще немає</p>
        </Container>
      </div>

      {/* No navigation: the preview is for looking at one page’s content, and
          any link out leads to the live site, which does not have these edits. */}
      <SiteHeader bare />
      <main className="flex-1">
        {blocks.length === 0 ? (
          <Container className="py-24">
            <p className="text-muted-foreground text-[15px]">
              На цій сторінці немає видимих блоків.
            </p>
          </Container>
        ) : (
          <BlockRenderer blocks={blocks} staged={{ locations, photos }} />
        )}
      </main>
      <SiteFooter bare />
    </div>
  );
}
