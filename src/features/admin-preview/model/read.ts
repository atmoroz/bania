import type { Location } from "@/entities/location";
import type { Photo } from "@/entities/photo";
import { createSupabaseServerClient, getAdmin } from "@/shared/api";

import { stagedCatalogue, stagedGallery } from "./types";

/**
 * How long a staged preview is worth showing.
 *
 * The editors clear their own as soon as they save or discard, so this only
 * matters when somebody staged a preview and then walked away: an hour
 * later the published page is the honest answer, not whatever was on their
 * screen.
 */
const STALE_AFTER_MS = 60 * 60 * 1000;

async function readStaged(scope: "catalogue" | "gallery"): Promise<unknown> {
  const admin = await getAdmin();
  if (!admin) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_previews")
    .select("payload, updated_at")
    .eq("scope", scope)
    .maybeSingle();

  if (!data) return null;
  if (Date.now() - new Date(data.updated_at).getTime() > STALE_AFTER_MS) return null;

  return data.payload;
}

/**
 * The staged catalogue, or null when the owner has not previewed one.
 *
 * Invalid payloads are ignored rather than thrown: a preview is a
 * convenience, and the published page is the right thing to fall back to.
 */
export async function getStagedCatalogue(): Promise<Location[] | null> {
  const parsed = stagedCatalogue.safeParse(await readStaged("catalogue"));
  return parsed.success ? parsed.data : null;
}

export async function getStagedGallery(): Promise<Photo[] | null> {
  const parsed = stagedGallery.safeParse(await readStaged("gallery"));
  return parsed.success ? parsed.data : null;
}
