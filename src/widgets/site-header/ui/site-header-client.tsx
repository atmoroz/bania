"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";

import { cn } from "@/shared/lib";
import { ButtonLink, Container } from "@/shared/ui";

export type HeaderNavItem = { href: string; label: string };

/**
 * The only Client Component on the public site. It exists solely to hold the
 * open/closed state of the mobile menu, so everything it needs arrives as
 * props — no data fetching behind a client boundary.
 */
export function SiteHeaderClient({
  wordmark,
  siteTitle,
  phoneDisplay,
  phoneHref,
  navigation,
}: {
  wordmark: string;
  siteTitle: string;
  phoneDisplay: string;
  phoneHref: string;
  navigation: HeaderNavItem[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-bronze/15 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-6 md:h-20">
        <Link
          href="/"
          className="group flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/logo.png"
            alt=""
            width={44}
            height={44}
            priority
            className="ring-bronze/40 group-hover:ring-bronze size-11 shrink-0 rounded-full ring-1 transition-[--tw-ring-color] duration-200"
          />
          <span className="flex flex-col leading-none whitespace-nowrap">
            <span className="label-caps text-bronze">{wordmark}</span>
            <span className="font-display mt-1 text-[18px]">{siteTitle}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8" aria-label="Основна навігація">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "label-caps whitespace-nowrap transition-colors",
                pathname === item.href
                  ? "text-bronze"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={phoneHref}
            className="label-caps text-foreground hover:text-bronze hidden items-center gap-2 whitespace-nowrap transition-colors md:flex"
          >
            <Phone className="size-4" aria-hidden />
            {phoneDisplay}
          </a>

          <ButtonLink href="/booking" className="hidden whitespace-nowrap xl:inline-flex">
            Забронювати
          </ButtonLink>

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
        </div>
      </Container>

      {open ? (
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
