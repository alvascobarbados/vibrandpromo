import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Sourcing data (suppliers + the product ↔ supplier link) is staff-only. It
 * deliberately lives in its own tables instead of columns on `products` so the
 * public product API can never return it. Cost fields (unit cost, currency,
 * quantity breaks) will join `product_sourcing` next.
 */

export const SHIPPING_MODES = ["Air", "Ocean", "Local"] as const;
export type ShippingMode = (typeof SHIPPING_MODES)[number];

export const UNIT_SYSTEMS = ["metric", "imperial"] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

export type Supplier = {
  id: string;
  name: string;
  code: string;
  country: string;
  default_shipping_mode: string;
  unit_system: string;
  notes: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductSourcing = {
  id: string;
  product_id: string;
  supplier_id: string | null;
  supplier_item_no: string | null;
};

export const suppliersQuery = queryOptions({
  queryKey: ["suppliers"],
  queryFn: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Supplier[];
  },
});

export const productSourcingQuery = queryOptions({
  queryKey: ["product_sourcing"],
  queryFn: async (): Promise<ProductSourcing[]> => {
    const { data, error } = await supabase
      .from("product_sourcing")
      .select("id, product_id, supplier_id, supplier_item_no");
    if (error) throw error;
    return (data ?? []) as ProductSourcing[];
  },
});

/** How a supplier reads everywhere in the app: "ABC — Acme Trading". */
export function supplierLabel(supplier: Pick<Supplier, "code" | "name">) {
  return `${supplier.code} — ${supplier.name}`;
}

/** Codes are exactly three letters, stored uppercase (same rule as the ERP). */
export function supplierCodeProblem(code: string) {
  const value = code.trim().toUpperCase();
  if (!value) return "Enter a 3-letter supplier code.";
  if (!/^[A-Z]{3}$/.test(value)) return "The supplier code must be exactly 3 letters.";
  return null;
}

export function normalizeSupplierCode(code: string) {
  return code.trim().toUpperCase();
}

/** Writes go through the staff session, so the staff-only RLS policies apply. */
export async function saveProductSourcing(input: {
  product_id: string;
  supplier_id: string | null;
  supplier_item_no: string | null;
}) {
  const { error } = await supabase.from("product_sourcing").upsert(
    {
      product_id: input.product_id,
      supplier_id: input.supplier_id,
      supplier_item_no: input.supplier_item_no?.trim() ? input.supplier_item_no.trim() : null,
    },
    { onConflict: "product_id" },
  );
  if (error) throw error;
}

export async function createSupplier(input: { name: string; code: string }) {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ name: input.name.trim(), code: normalizeSupplierCode(input.code) })
    .select("*")
    .single();
  if (error) throw error;
  return data as Supplier;
}