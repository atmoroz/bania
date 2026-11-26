import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * Client for reading public content.
 *
 * Deliberately the plain supabase-js client and not the cookie-aware `@supabase/ssr`
 * one: reading cookies would opt every page into dynamic rendering, and none of this
 * content depends on who is asking. The admin panel will need the cookie-aware client,
 * and that is a different file.
 *
 * Safe with the publishable key only because RLS is on every table. The key grants
 * nothing by itself.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set. " +
        "Copy .env.example to .env.local and fill them in.",
    );
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Public URL of an object in the `media` bucket. */
export function mediaUrl(storagePath: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${url}/storage/v1/object/public/media/${storagePath}`;
}

/**
 * Everything the public site reads shares this tag, so one `updateTag` from the
 * admin panel refreshes the whole site after a content change.
 */
export const CONTENT_TAG = "site-content";
