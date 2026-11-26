"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * Cookie-aware client for the browser.
 *
 * It exists for one job: uploading a file straight from the panel into
 * Storage. The alternative — posting the bytes to a Server Action — runs into
 * the 1 MB body limit Next puts on actions, while the bucket accepts 10 MB,
 * so the limit that would decide what the owner may upload would be an
 * accident of the framework rather than a decision. Uploading from here hits
 * Storage directly, under the administrator's own session, and the
 * `media_admin_insert` policy written for exactly this is what authorises it.
 *
 * Everything else still goes through Server Actions.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL and publishable key must be set.");
  }

  return createBrowserClient<Database>(url, key);
}
