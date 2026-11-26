"use server";

import { createSupabaseServerClient, getAdmin, type Json } from "@/shared/api";

import type { StagedCard, StagedPhoto } from "./types";

export type StageResult = { ok: true } | { ok: false; message: string };

/**
 * Puts unsaved work where the preview route can draw it.
 *
 * What is staged is the shape the page renders, not the payload that would
 * be saved. The catalogue and the gallery come from normalised tables, and
 * resolving ids back into photographs and prices inside the preview would be
 * a second copy of the query that renders them, free to drift. The panel
 * already holds the resolved version, so it sends that.
 */
async function stage(scope: "catalogue" | "gallery", payload: Json): Promise<StageResult> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("admin_previews")
    .upsert({ scope, payload }, { onConflict: "scope" });

  if (error) return { ok: false, message: `Не вдалося підготувати перегляд: ${error.message}` };
  return { ok: true };
}

export async function stageCatalogue(cards: StagedCard[]): Promise<StageResult> {
  return stage("catalogue", cards);
}

export async function stageGallery(photos: StagedPhoto[]): Promise<StageResult> {
  return stage("gallery", photos);
}

/**
 * Throws the staged copy away.
 *
 * Called when the editor saves or discards: from that moment the published
 * page is the truth, and a preview still showing the old staged version
 * would be a lie that outlives the work it belonged to.
 */
export async function clearStaged(scope: "catalogue" | "gallery"): Promise<void> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");

  const supabase = await createSupabaseServerClient();
  await supabase.from("admin_previews").delete().eq("scope", scope);
}
