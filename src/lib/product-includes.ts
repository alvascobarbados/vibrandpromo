/**
 * "Included items" — the simple staff-only list of what ships with a product
 * ("2 × AAA batteries"). Deliberately NOT kit components: no pricing, no
 * component products, just quantity + description + order.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type ProductInclude = {
  id: string;
  product_id: string;
  quantity: number;
  description: string;
  sort_order: number;
};

export const productIncludesQuery = queryOptions({
  queryKey: ["product_includes"],
  queryFn: async (): Promise<ProductInclude[]> => {
    const { data, error } = await supabase
      .from("product_includes")
      .select("id, product_id, quantity, description, sort_order")
      .order("sort_order", { ascending: true })
      .returns<ProductInclude[]>();
    if (error) throw error;
    return data ?? [];
  },
});

export async function addProductInclude(input: {
  productId: string;
  quantity: number;
  description: string;
  sortOrder: number;
}) {
  const description = input.description.trim();
  if (!description) throw new Error("Enter what's included.");
  if (!Number.isFinite(input.quantity) || input.quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }
  const { error } = await supabase.from("product_includes").insert({
    product_id: input.productId,
    quantity: Math.round(input.quantity),
    description,
    sort_order: input.sortOrder,
  });
  if (error) throw new Error(error.message);
}

export async function updateProductInclude(
  id: string,
  patch: { quantity?: number; description?: string; sort_order?: number },
) {
  if (patch.description != null && !patch.description.trim()) {
    throw new Error("Enter what's included.");
  }
  if (patch.quantity != null && (!Number.isFinite(patch.quantity) || patch.quantity < 1)) {
    throw new Error("Quantity must be at least 1.");
  }
  const { error } = await supabase
    .from("product_includes")
    .update({
      ...(patch.quantity != null ? { quantity: Math.round(patch.quantity) } : {}),
      ...(patch.description != null ? { description: patch.description.trim() } : {}),
      ...(patch.sort_order != null ? { sort_order: patch.sort_order } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProductInclude(id: string) {
  const { error } = await supabase.from("product_includes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Reorder by swapping sort_order with the neighbour in `direction`. */
export async function moveProductInclude(
  rows: ProductInclude[],
  id: string,
  direction: -1 | 1,
) {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const at = sorted.findIndex((row) => row.id === id);
  const other = sorted[at + direction];
  const self = sorted[at];
  if (!self || !other) return;
  await updateProductInclude(self.id, { sort_order: other.sort_order });
  await updateProductInclude(other.id, { sort_order: self.sort_order });
}

export function includeLabel(row: Pick<ProductInclude, "quantity" | "description">) {
  return `${row.quantity} × ${row.description}`;
}
