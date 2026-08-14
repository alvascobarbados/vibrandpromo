/**
 * Helpers for the /team Pricelist. Display-only logic — the ERP costing engine
 * that will read these tables lives server-side later.
 */
import { supabase } from "@/integrations/supabase/client";

/** Field-level product write, same staff-gated products path the editors use. */
export async function updateProductFields(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from("products")
    .update(patch as never)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Row-kebab duplicate: copies the product as a hidden sibling in the same SKU
 * family (trailing "X" is how the ERP marks variants), so nothing appears on
 * the customer catalogue until staff publish it. Same staff-gated products
 * path as every other write here.
 */
export async function duplicateProduct(id: string) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) throw error;
  const row = data as Record<string, unknown>;
  delete row['id'];
  delete row['created_at'];
  delete row['updated_at'];
  const suffix = Date.now().toString(36).slice(-4);
  const insert = {
    ...row,
    name: `${String(row['name'])} (copy)`,
    slug: `${String(row['slug'])}-copy-${suffix}`,
    sku: row['sku'] ? `${String(row['sku'])}X` : null,
    is_active: false,
    is_featured: false,
  };
  const { data: created, error: insertError } = await supabase
    .from("products")
    .insert(insert as never)
    .select("id")
    .single();
  if (insertError) throw insertError;
  return (created as { id: string }).id;
}

/** Blank clears the value; anything non-numeric is rejected by the caller. */
export function numOrNull(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function positiveProblem(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return "Must be greater than 0.";
  return null;
}

/**
 * SKU family: products that share a base code are variants of one item.
 * "B01003", "B01003X" and "B01003-RED" all belong to family "B01003".
 */
export function skuFamily(sku: string | null | undefined) {
  const base = (sku ?? "").trim().toUpperCase().split(/[-_/]/)[0] ?? "";
  return base.replace(/X+$/, "") || base;
}

export function moneyLabel(value: number | null | undefined) {
  if (value == null) return "—";
  return `$${Number(value).toFixed(2)}`;
}

export function numberText(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

/** Carton dimensions read as L × W × H, blanks collapse to a dash. */
export function cartonDims(
  l: number | null,
  w: number | null,
  h: number | null,
  metric: boolean,
) {
  if (l == null && w == null && h == null) return "—";
  const part = (value: number | null) => (value == null ? "?" : String(value));
  return `${part(l)} × ${part(w)} × ${part(h)} ${metric ? "cm" : "in"}`;
}

export function weightLabel(value: number | null, metric: boolean) {
  if (value == null) return "—";
  return `${value} ${metric ? "kg" : "lb"}`;
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "never";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}