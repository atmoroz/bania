import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  CalendarDays,
  FileText,
  Images,
  LayoutGrid,
  Loader2,
  LogOut,
  MapPin,
  Settings,
  Star,
} from "lucide-react";

import { signOut } from "@/features/admin-auth";
import { getAdmin } from "@/shared/api";
import { Button, Container } from "@/shared/ui";

const tabs = [
  { href: "/admin/bookings", label: "Бронювання", icon: CalendarDays },
  { href: "/admin/pages", label: "Сторінки", icon: FileText },
  { href: "/admin/locations", label: "Локації", icon: MapPin },
  { href: "/admin/gallery", label: "Галерея", icon: LayoutGrid },
  { href: "/admin/reviews", label: "Відгуки", icon: Star },
  // The library is where you go to add a file, not to run the place: it
  // sits with the settings rather than among the pages people read.
  { href: "/admin/media", label: "Медіа", icon: Images },
  { href: "/admin/settings", label: "Налаштування", icon: Settings },
];

/**
 * The guard for the whole admin area.
 *
 * It sits inside a Suspense boundary because Cache Components requires any
 * request-time data — cookies here — to be read inside one, so the shell can
 * still prerender. That changes nothing about the security: `children` are
 * elements, not rendered work, and they only execute once AdminShell has
 * awaited the check and returned a tree containing them.
 *
 * The check lives here rather than in the proxy. The proxy refreshes the
 * session; it is a convenience. This is the authorisation.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Sticky, like the public header: the tabs are how you move around
          the panel, and the lists here are long enough that losing them off
          the top means scrolling back for every move. Translucent with a
          blur so the content reads as passing under it. */}
      <header className="border-bronze/15 bg-surface-lowest/90 sticky top-0 z-50 border-b backdrop-blur-xl">
        {/* Two rows, always. One row held three tabs; at seven the labels
            ran into the administrator's own email on a 1568px screen, and
            the arrangement that fixed it on a phone — a scrolling strip of
            its own — turns out to be the right one everywhere. */}
        <Container className="flex h-14 items-center justify-between gap-3">
          <Link href="/admin" className="label-caps text-bronze shrink-0">
            Адмінпанель
          </Link>

          <div className="flex min-w-0 shrink items-center gap-4">
            <span className="text-muted-foreground hidden truncate text-[13px] md:inline">
              {admin.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="px-3 py-2 sm:px-4" title="Вийти">
                <LogOut className="size-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Вийти</span>
                <span className="sr-only sm:hidden">Вийти</span>
              </Button>
            </form>
          </div>
        </Container>

        <Container>
          {/* Scrolls rather than wraps: a tab that moves to a second line as
              the window narrows makes the whole page jump down with it. */}
          <nav className="-mx-5 flex items-center gap-6 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="label-caps text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-2 transition-colors"
              >
                <tab.icon className="size-4 shrink-0" aria-hidden />
                {tab.label}
              </Link>
            ))}
          </nav>
        </Container>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function AdminLoading() {
  return (
    <div className="text-muted-foreground flex min-h-dvh items-center justify-center gap-3 text-[15px]">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Перевіряємо доступ…
    </div>
  );
}
