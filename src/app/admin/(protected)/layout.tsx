import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CalendarDays, Loader2, LogOut } from "lucide-react";

import { signOut } from "@/features/admin-auth";
import { getAdmin } from "@/shared/api";
import { Button, Container } from "@/shared/ui";

const tabs = [{ href: "/admin/bookings", label: "Бронювання", icon: CalendarDays }];

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
        <Container className="flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="label-caps text-bronze">
              Адмінпанель
            </Link>
            <nav className="flex items-center gap-6">
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="label-caps text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <tab.icon className="size-4" aria-hidden />
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <span className="text-muted-foreground hidden text-[13px] md:inline">
              {admin.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" className="px-4 py-2">
                <LogOut className="size-4" aria-hidden />
                Вийти
              </Button>
            </form>
          </div>
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
