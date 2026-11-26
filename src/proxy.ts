import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Keeps the Supabase session alive.
 *
 * Named `proxy`, not `middleware`: Next.js 16 renamed the convention, and a
 * `middleware.ts` is simply never called — sessions would stop refreshing and
 * the administrator would appear to be signed out at random.
 *
 * The response object built here is the one that must be returned. An earlier
 * response does not carry the refreshed cookies, so the next request arrives
 * signed out.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // The library hands over Cache-Control, Expires and Pragma; without
        // them a CDN could cache one administrator's session for everyone.
        for (const [header, headerValue] of Object.entries(headers ?? {})) {
          response.headers.set(header, headerValue);
        }
      },
    },
  });

  // This call is what refreshes the token. Removing it makes the proxy a
  // no-op that still looks like it is doing something.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Only the admin area needs a session. The public pages are static and must
  // stay that way.
  matcher: ["/admin/:path*"],
};
