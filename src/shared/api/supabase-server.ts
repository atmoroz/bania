import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * Cookie-aware client, for the admin panel only.
 *
 * Separate from `createPublicClient` on purpose: reading cookies opts a route
 * into dynamic rendering, which is right for `/admin` and wrong for every
 * public page. Created per request — never at module level — because a client
 * holds the caller's session.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL and publishable key must be set.");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A Server Component cannot set cookies. Harmless here: the proxy
          // refreshes the session on every request, so the write it rejects
          // has already happened there.
        }
      },
    },
  });
}

/**
 * The signed-in administrator, or null.
 *
 * Uses `getClaims`, not `getSession`. Supabase is explicit that a session
 * cookie can be forged, and `getSession` only reads it; `getClaims` verifies
 * the token's signature. Being signed in is then checked against the
 * administrator allowlist in the database, because authentication is not
 * authorisation.
 */
export async function getAdmin() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ? { id: data.claims.sub as string, email: data.claims.email as string | undefined } : null;
}
