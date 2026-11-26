"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/shared/api";

export type SignInState = { error: string | null };

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Введіть пошту та пароль." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: saying which half was wrong tells an attacker which
    // addresses exist.
    return { error: "Невірна пошта або пароль." };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    // Signed in, but not on the administrator list. End the session rather
    // than leave a half-authorised one lying around.
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Цей обліковий запис не має доступу до адмінпанелі." };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  // Local scope: end this session only. The default is global, which would
  // sign the owner out of every device they are using.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}
