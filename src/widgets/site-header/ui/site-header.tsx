"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";

import { navigation, siteConfig } from "@/shared/config/site";
import { cn } from "@/shared/lib";
import { ButtonLink, Container } from "@/shared/ui";

/**
 * Low-profile fixed header on a frosted steam surface, per the design.
 *
 * This is the only Client Component on the public site: it exists solely to
 * hold the open/closed state of the mobile menu. Everything it renders is
 * static, so the boundary stays as small as it can be.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-bronze/15 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-6 md:h-20">
        <Link href="/" className="flex flex-col leading-none" onClick={() => setOpen(false)}>
          <span className="label-caps text-bronze">{siteConfig.wordmark}</span>
          <span className="font-display mt-1 text-[18px]">{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Основна навігація">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "label-caps transition-colors",
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
            href={siteConfig.phone.href}
            className="label-caps text-foreground hover:text-bronze hidden items-center gap-2 transition-colors md:flex"
          >
            <Phone className="size-4" aria-hidden />
            {siteConfig.phone.display}
          </a>

          <ButtonLink href="/booking" className="hidden lg:inline-flex">
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
            <a
              href={siteConfig.phone.href}
              className="text-bronze flex items-center gap-2 py-4 text-[15px]"
            >
              <Phone className="size-4" aria-hidden />
              {siteConfig.phone.display}
            </a>
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
