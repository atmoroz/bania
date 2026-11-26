"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";

import { cn } from "@/shared/lib";
import { ButtonLink, Container, LogoMark } from "@/shared/ui";

export type HeaderNavItem = { href: string; label: string };

/**
 * The only Client Component on the public site. It exists solely to hold the
 * open/closed state of the mobile menu, so everything it needs arrives as
 * props — no data fetching behind a client boundary.
 *
 * `bare` strips every way out of the page — navigation, the mobile menu, the
 * booking button and the link on the wordmark — leaving the header as a piece
 * of the design. The preview uses it: it is there to show one page's content,
 * and a link that walks the viewer off into the live site would only mislead,
 * because the pages it leads to do not carry the unpublished edits.
 */
export function SiteHeaderClient({
  wordmark,
  siteTitle,
  phoneDisplay,
  phoneHref,
  navigation,
  bare = false,
}: {
  wordmark: string;
  siteTitle: string;
  phoneDisplay: string;
  phoneHref: string;
  navigation: HeaderNavItem[];
  bare?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "border-bronze/15 bg-background/80 z-50 border-b backdrop-blur-xl",
        // Not sticky when bare: the preview's own banner holds the top of the
        // screen, and two sticky bars at top-0 would cover one another.
        bare ? "relative" : "sticky top-0",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-6 md:h-20">
        <Wordmark asLink={!bare} onNavigate={() => setOpen(false)}>
          <LogoMark
            id="header"
            title=""
            aria-hidden
            className="size-11 shrink-0 transition-transform duration-200 group-hover:scale-105"
          />
          <span className="flex flex-col leading-none whitespace-nowrap">
            <span className="label-caps text-bronze">{wordmark}</span>
            <span className="font-display mt-1 text-[18px]">{siteTitle}</span>
          </span>
        </Wordmark>

        <div className="flex items-center gap-4">
          <a
            href={phoneHref}
            className="label-caps text-foreground hover:text-bronze hidden items-center gap-2 whitespace-nowrap transition-colors md:flex"
          >
            <Phone className="size-4" aria-hidden />
            {phoneDisplay}
          </a>

          {bare ? null : (
            <ButtonLink href="/booking" className="hidden whitespace-nowrap lg:inline-flex">
              Забронювати
            </ButtonLink>
          )}

          {bare ? null : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="hover:text-bronze -mr-2 p-2 transition-colors lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Закрити меню" : "Відкрити меню"}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
          )}
        </div>
      </Container>

      {/* The links sit on a second row from the large breakpoint up. They
          used to share the first one with the wordmark, the phone and the
          booking button, which fitted six pages and would not fit seven —
          and the owner can add pages. A row of their own grows instead of
          overflowing, and scrolls rather than wrapping if it ever has to,
          since a wrapping row would push the whole page down. */}
      {bare ? null : (
        <div className="border-bronze/10 hidden border-t lg:block">
          <Container>
            <nav
              className="-mx-5 flex items-center gap-7 overflow-x-auto px-5 py-3 [scrollbar-width:none] md:-mx-8 md:px-8 lg:-mx-16 lg:px-16 [&::-webkit-scrollbar]:hidden"
              aria-label="Основна навігація"
            >
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "label-caps shrink-0 whitespace-nowrap transition-colors",
                    pathname === item.href
                      ? "text-bronze"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </Container>
        </div>
      )}

      {open && !bare ? (
        <nav
          id="mobile-nav"
          className="border-bronze/15 bg-background border-t lg:hidden"
          aria-label="Мобільна навігація"
        >
          <Container className="flex flex-col py-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "border-bronze/10 border-b py-4 text-[15px] last:border-b-0",
                  pathname === item.href ? "text-bronze" : "text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <a href={phoneHref} className="text-bronze flex items-center gap-2 py-4 text-[15px]">
              <Phone className="size-4" aria-hidden />
              {phoneDisplay}
            </a>
          </Container>
        </nav>
      ) : null}
    </header>
  );
}

/** The logo and name: a link home on the site, plain text where there is
 *  nowhere to go. */
function Wordmark({
  asLink,
  onNavigate,
  children,
}: {
  asLink: boolean;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  const className = "group flex items-center gap-3";
  return asLink ? (
    <Link href="/" className={className} onClick={onNavigate}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}
