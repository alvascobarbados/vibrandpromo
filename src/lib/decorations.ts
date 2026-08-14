/**
 * Decoration master data + the staff-only pricing structures behind the /team
 * Pricelist. These tables carry costs, so every read/write here runs through
 * the signed-in staff session (same RLS pattern as product_sourcing) and no
 * anonymous/public query ever touches them.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type DecorationMethod = {
  id: string;
  code: string;
  name: string;
};

export type MethodDetail = {
  id: string;
  decoration_method_id: string;
  code: string;
  detail: string;
};

export type DecorationBand = {
  id: string;
  product_decoration_id: string;
  qty: number;
  unit_cost: number;
  setup_cost: number;
  inland_freight_usd: number | null;
};

export type ProductDecoration = {
  id: string;
  product_id: string;
  method_detail_id: string;
  sort_order: number;
  updated_at: string;
  product_decoration_bands: DecorationBand[];
};

export const DEFAULT_BAND_QTYS = [100, 250, 500, 1000];

export const decorationMethodsQuery = queryOptions({
  queryKey: ["decoration_methods"],
  queryFn: async (): Promise<DecorationMethod[]> => {
    const { data, error } = await supabase
      .from("decoration_methods")
      .select("id, code, name")
      .order("name", { ascending: true })
      .returns<DecorationMethod[]>();
    if (error) throw error;
    return data ?? [];
  },
});

export const methodDetailsQuery = queryOptions({
  queryKey: ["method_details"],
  queryFn: async (): Promise<MethodDetail[]> => {
    const { data, error } = await supabase
      .from("method_details")
      .select("id, decoration_method_id, code, detail")
      .order("code", { ascending: true })
      .returns<MethodDetail[]>();
    if (error) throw error;
    return data ?? [];
  },
});

export const productDecorationsQuery = queryOptions({
  queryKey: ["product_decorations"],
  queryFn: async (): Promise<ProductDecoration[]> => {
    const { data, error } = await supabase
      .from("product_decorations")
      .select(
        "id, product_id, method_detail_id, sort_order, updated_at, product_decoration_bands(id, product_decoration_id, qty, unit_cost, setup_cost, inland_freight_usd)",
      )
      .order("sort_order", { ascending: true })
      .returns<ProductDecoration[]>();
    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...row,
      product_decoration_bands: [...(row.product_decoration_bands ?? [])].sort(
        (a, b) => a.qty - b.qty,
      ),
    }));
  },
});

/** Which products already have a price table — used for the read-only handover. */
export const decoratedProductIdsQuery = queryOptions({
  queryKey: ["product_decorations", "product_ids"],
  queryFn: async (): Promise<string[]> => {
    const { data, error } = await supabase.from("product_decorations").select("product_id");
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((row) => row.product_id as string)));
  },
});

export function detailLabel(detail: MethodDetail, methodName: string) {
  return `${methodName} — ${detail.detail}`;
}

/** A new block starts with the four standard quantity bands, costs blank. */
export async function addProductDecoration(input: {
  product_id: string;
  method_detail_id: string;
  sort_order: number;
}) {
  const { data, error } = await supabase
    .from("product_decorations")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  const decorationId = (data as { id: string }).id;
  const { error: bandError } = await supabase.from("product_decoration_bands").insert(
    DEFAULT_BAND_QTYS.map((qty) => ({
      product_decoration_id: decorationId,
      qty,
      unit_cost: 0,
      setup_cost: 0,
    })),
  );
  if (bandError) throw bandError;
  return decorationId;
}

export async function deleteProductDecoration(id: string) {
  const { error } = await supabase.from("product_decorations").delete().eq("id", id);
  if (error) throw error;
}

export async function addDecorationBand(product_decoration_id: string, qty: number) {
  const { error } = await supabase
    .from("product_decoration_bands")
    .insert({ product_decoration_id, qty, unit_cost: 0, setup_cost: 0 });
  if (error) throw error;
}

export async function deleteDecorationBand(id: string) {
  const { error } = await supabase.from("product_decoration_bands").delete().eq("id", id);
  if (error) throw error;
}

export async function updateDecorationBand(
  id: string,
  patch: {
    qty?: number;
    unit_cost?: number;
    setup_cost?: number;
    inland_freight_usd?: number | null;
  },
) {
  const { error } = await supabase.from("product_decoration_bands").update(patch).eq("id", id);
  if (error) throw error;
}