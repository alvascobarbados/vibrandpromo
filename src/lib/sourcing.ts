import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/catalog";

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
  origin_id: string | null;
  default_shipping_mode: string;
  unit_system: string;
  contact: string | null;
  notes: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Origin = {
  id: string;
  code: string;
  name: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export const originsQuery = queryOptions({
  queryKey: ["origins"],
  queryFn: async (): Promise<Origin[]> => {
    const { data, error } = await supabase
      .from("origins")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Origin[];
  },
});

/** Origin codes are uppercase snake case, matching the pricing engine. */
export function normalizeOriginCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function originCodeProblem(code: string) {
  const value = normalizeOriginCode(code);
  if (!value) return "Enter an origin code.";
  if (!/^[A-Z0-9_]+$/.test(value)) return "Use letters, numbers and underscores only.";
  return null;
}

export async function createOrigin(input: { code: string; name: string }) {
  const { data, error } = await supabase
    .from("origins")
    .insert({ code: normalizeOriginCode(input.code), name: input.name.trim() })
    .select("*")
    .single();
  if (error) throw error;
  return data as Origin;
}

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

/**
 * Admin products list row: the product plus its sourcing link and supplier in a
 * single staff-only query. Public/anonymous catalogue queries (publicProductsQuery)
 * never select these fields, and `product_sourcing`/`suppliers` are staff-only by RLS.
 */
export type AdminProductRow = Product & {
  product_sourcing: Array<{
    supplier_id: string | null;
    supplier_item_no: string | null;
    suppliers: { id: string; code: string; name: string } | null;
  }>;
};

const sel = (s: string): string => s;

export const adminProductRowsQuery = queryOptions({
  queryKey: ["products", "all", "sourcing"],
  queryFn: async (): Promise<AdminProductRow[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(
        sel("*, product_sourcing(supplier_id, supplier_item_no, suppliers(id, code, name))"),
      )
      .order("created_at", { ascending: false })
      .returns<AdminProductRow[]>();
    if (error) throw error;
    return data ?? [];
  },
});

export function rowSourcing(row: AdminProductRow) {
  return row.product_sourcing?.[0] ?? null;
}