/**
 * Staff-only product attribute rows for the /team Pricelist. Labels come from
 * detail_labels (shared vocabulary); values live in product_details, unique per
 * product + label. MATERIAL and SIZE remain fixed columns on products.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type DetailLabel = { id: string; label: string; sort_order: number };

export type ProductDetailRow = {
  id: string;
  product_id: string;
  detail_label_id: string;
  value: string;
  sort_order: number;
};

export const detailLabelsQuery = queryOptions({
  queryKey: ["detail_labels"],
  queryFn: async (): Promise<DetailLabel[]> => {
    const { data, error } = await supabase
      .from("detail_labels")
      .select("id, label, sort_order")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true })
      .returns<DetailLabel[]>();
    if (error) throw error;
    return data ?? [];
  },
});

export const productDetailsQuery = queryOptions({
  queryKey: ["product_details"],
  queryFn: async (): Promise<ProductDetailRow[]> => {
    const { data, error } = await supabase
      .from("product_details")
      .select("id, product_id, detail_label_id, value, sort_order")
      .order("sort_order", { ascending: true })
      .returns<ProductDetailRow[]>();
    if (error) throw error;
    return data ?? [];
  },
});

function friendly(message: string) {
  if (/duplicate key|unique/i.test(message)) {
    return "That attribute is already on this product.";
  }
  return message;
}

export async function addProductDetail(input: {
  productId: string;
  detailLabelId: string;
  value: string;
  sortOrder: number;
}) {
  const value = input.value.trim();
  if (!value) throw new Error("Enter a value.");
  const { error } = await supabase.from("product_details").insert({
    product_id: input.productId,
    detail_label_id: input.detailLabelId,
    value,
    sort_order: input.sortOrder,
  });
  if (error) throw new Error(friendly(error.message));
}

export async function updateProductDetailValue(id: string, value: string) {
  const next = value.trim();
  if (!next) throw new Error("Enter a value.");
  const { error } = await supabase.from("product_details").update({ value: next }).eq("id", id);
  if (error) throw new Error(friendly(error.message));
}

export async function deleteProductDetail(id: string) {
  const { error } = await supabase.from("product_details").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Creates a label if the staff member types a new one, otherwise reuses it. */
export async function ensureDetailLabel(name: string): Promise<DetailLabel> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a label.");
  const { data: existing } = await supabase
    .from("detail_labels")
    .select("id, label, sort_order")
    .ilike("label", trimmed)
    .limit(1)
    .maybeSingle();
  if (existing) return existing as DetailLabel;
  const { data, error } = await supabase
    .from("detail_labels")
    .insert({ label: trimmed, sort_order: 999 })
    .select("id, label, sort_order")
    .single();
  if (error) throw new Error(friendly(error.message));
  return data as DetailLabel;
}
