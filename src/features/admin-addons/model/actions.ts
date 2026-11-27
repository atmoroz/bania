"use server";

import { updateTag } from "next/cache";

import { CONTENT_TAG, createSupabaseServerClient, getAdmin } from "@/shared/api";

export type AdminAddon = {
  id: string | null;
  name: string;
  description: string;
  /** Hryvnia in the panel; kopiyky in the column. */
  price: number;
  unit: string;
  category: string;
  isVisible: boolean;
};

export type AddonsResult = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorised");
}

/** Every add-on, hidden ones included, in display order. */
export async function getAdminAddons(): Promise<AdminAddon[]> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("addons")
    .select("id, name, description, price, unit, category, is_visible")
    .order("sort_order");

  if (error) throw new Error(`Failed to load the add-ons: ${error.message}`);

  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description ?? "",
    price: a.price,
    unit: a.unit,
    category: a.category ?? "",
    isVisible: a.is_visible,
  }));
}

/** Saves the whole list in one transaction; see `20261127140000_save_addons.sql`. */
export async function saveAddons(addons: AdminAddon[]): Promise<AddonsResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_addons", {
    payload: addons
      // A row with no name is a line the owner started and left.
      .filter((a) => a.name.trim() !== "")
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        price: a.price,
        unit: a.unit,
        category: a.category,
        is_visible: a.isVisible,
      })),
  });

  if (error) return { ok: false, message: `Не вдалося зберегти: ${error.message}` };

  updateTag(CONTENT_TAG);
  return { ok: true };
}
