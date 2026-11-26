import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignInForm } from "@/features/admin-auth";
import { getAdmin } from "@/shared/api";

export const metadata: Metadata = { title: "Вхід до адмінпанелі", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      {/* The already-signed-in check reads cookies, so it lives inside a
          boundary; the form itself prerenders. */}
      <Suspense fallback={<SignInForm />}>
        <RedirectIfSignedIn />
      </Suspense>
    </main>
  );
}

async function RedirectIfSignedIn() {
  if (await getAdmin()) redirect("/admin");
  return <SignInForm />;
}
