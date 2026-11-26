import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CalendarDays, FileText, Images, LayoutGrid, Loader2, LogOut, Star } from "lucide-react";

import { signOut } from "@/features/admin-auth";
import { getAdmin } from "@/shared/api";
import { Button, Container } from "@/shared/ui";

const tabs = [
  { href: "/admin/bookings", label: "Бронювання", icon: CalendarDays },
  { href: "/admin/pages", label: "Сторінки", icon: FileText },
  { href: "/admin/media", label: "Медіа", icon: Images },
  { href: "/admin/gallery", label: "Галерея", icon: LayoutGrid },
  { href: "/admin/reviews", label: "Відгуки", icon: Star },
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
      <header className="border-bronze/15 bg-surface-lowest border-b">
        <Container className="flex h-16 items-center justify-between gap-3 sm:gap-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <Link href="/admin" className="label-caps text-bronze shrink-0">
              Адмінпанель
            </Link>
            {/* On a wide screen the tabs sit beside the wordmark. On a phone
                they move to their own row below: three labels plus the
                wordmark and the exit button need 536px, so sharing a line
                would squeeze the tabs into a 165px strip to scroll inside.
                A full-width row fits all three with room over. */}
            <nav className="hidden items-center gap-6 sm:flex">
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
          </div>

          <div className="flex shrink-0 items-center gap-5">
            <span className="text-muted-foreground hidden text-[13px] md:inline">
              {admin.email}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                className="px-3 py-2 sm:px-4"
                title="Вийти"
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Вийти</span>
                <span className="sr-only sm:hidden">Вийти</span>
              </Button>
            </form>
          </div>
        </Container>

        <Container className="sm:hidden">
          <nav className="-mx-5 flex items-center gap-5 overflow-x-auto px-5 pb-3">
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
