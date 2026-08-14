/**
 * Helpers for the /team Pricelist. Display-only logic — the ERP costing engine
 * that will read these tables lives server-side later.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * VIBRAND SKU GRAMMAR (ours — nothing is imported from any other ERP):
 *   [category char][2-digit subcategory][3-digit item][optional X][optional -VARIANT]
 * A variant keeps the item digits and takes the next free "-V{n}" suffix.
 */
export function skuBase(sku: string | null | undefined) {
  const raw = (sku ?? "").trim().toUpperCase();
  if (!raw) return "";
  return raw.split("-")[0]!.replace(/X+$/, "");
}

function nextFreeSuffix(base: string, taken: Set<string>) {
  let n = 2;
  while (taken.has(`${base}-V${n}`.toUpperCase())) n += 1;
  return `${base}-V${n}`;
}

/**
 * DUPLICATE AS VARIANT (ported behaviour from V3-1's duplicateProductAsVariant,
 * adapted to our grammar). The copy keeps the source's name, supplier and
 * category/subcategory so pure name-based grouping picks it up, and copies
 * packing (including explicit units), production fields, every decoration with
 * its bands, and product_details verbatim — as INDEPENDENT rows. The new SKU
 * comes from our own numbering (same item digits, next free -V suffix), the
 * supplier item number gets the next free -V{n}, the variant label starts blank
 * and a fresh variant is always hidden from customers until reviewed.
 */
export async function duplicateProductAsVariant(sourceProductId: string): Promise<string> {
  const { data: source, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", sourceProductId)
    .single();
  if (error) throw error;
  const row = { ...(source as Record<string, unknown>) };
  delete row['id'];
  delete row['created_at'];
  delete row['updated_at'];

  // New SKU — our grammar, next free -V suffix on the same item digits.
  const base = skuBase((row['sku'] as string | null) ?? null);
  let sku: string | null = null;
  if (base) {
    const { data: skus } = await supabase.from("products").select("sku").like("sku", `${base}%`);
    const taken = new Set(
      (skus ?? []).map((item) => String((item as { sku: string | null }).sku ?? "").toUpperCase()),
    );
    sku = nextFreeSuffix(base, taken);
  }

  const stamp = Date.now().toString(36).slice(-4);
  const insert = {
    ...row,
    sku,
    slug: `${String(row['slug'])}-v-${stamp}`,
    status: "draft",
    is_featured: false,
  };
  const { data: created, error: insertError } = await supabase
    .from("products")
    .insert(insert as never)
    .select("id")
    .single();
  if (insertError) throw insertError;
  const newId = (created as { id: string }).id;

  // Sourcing: same supplier + packing (with explicit units), blank variant label.
  const { data: sourcing } = await supabase
    .from("product_sourcing")
    .select("*")
    .eq("product_id", sourceProductId)
    .maybeSingle();
  if (sourcing) {
    const src = sourcing as Record<string, unknown>;
    const itemBase = String(src['supplier_item_no'] ?? "").replace(/-V\d+$/i, "");
    let itemNo: string | null = null;
    if (itemBase) {
      const { data: items } = await supabase
        .from("product_sourcing")
        .select("supplier_item_no")
        .like("supplier_item_no", `${itemBase}%`);
      const taken = new Set(
        (items ?? []).map((item) =>
          String((item as { supplier_item_no: string | null }).supplier_item_no ?? "").toUpperCase(),
        ),
      );
      itemNo = nextFreeSuffix(itemBase, taken);
    }
    const { error: sourcingError } = await supabase.from("product_sourcing").insert({
      product_id: newId,
      supplier_id: src['supplier_id'] ?? null,
      supplier_item_no: itemNo,
      supplier_item_name: src['supplier_item_name'] ?? null,
      variant_label: null,
      carton_pack: src['carton_pack'] ?? null,
      carton_length: src['carton_length'] ?? null,
      carton_width: src['carton_width'] ?? null,
      carton_height: src['carton_height'] ?? null,
      carton_weight: src['carton_weight'] ?? null,
      dimension_unit: src['dimension_unit'] ?? null,
      weight_unit: src['weight_unit'] ?? null,
    } as never);
    if (sourcingError) throw sourcingError;
  }

  // Decorations + their bands — independent copies.
  const { data: decorations } = await supabase
    .from("product_decorations")
    .select("id, method_detail_id, sort_order, notes, ref_image_url")
    .eq("product_id", sourceProductId);
  for (const decoration of decorations ?? []) {
    const { data: copy, error: decorationError } = await supabase
      .from("product_decorations")
      .insert({
        product_id: newId,
        method_detail_id: decoration.method_detail_id,
        sort_order: decoration.sort_order,
        notes: decoration.notes,
        ref_image_url: decoration.ref_image_url,
      } as never)
      .select("id")
      .single();
    if (decorationError) throw decorationError;
    const { data: bands } = await supabase
      .from("product_decoration_bands")
      .select("qty, unit_cost, setup_cost, inland_freight_usd")
      .eq("product_decoration_id", decoration.id);
    if (bands?.length) {
      const { error: bandError } = await supabase.from("product_decoration_bands").insert(
        bands.map((band) => ({
          product_decoration_id: (copy as { id: string }).id,
          qty: band.qty,
          unit_cost: band.unit_cost,
          setup_cost: band.setup_cost,
          inland_freight_usd: band.inland_freight_usd,
        })) as never,
      );
      if (bandError) throw bandError;
    }
  }

  // Attributes verbatim.
  const { data: details } = await supabase
    .from("product_details")
    .select("detail_label_id, value, sort_order")
    .eq("product_id", sourceProductId);
  if (details?.length) {
    const { error: detailError } = await supabase.from("product_details").insert(
      details.map((detail) => ({
        product_id: newId,
        detail_label_id: detail.detail_label_id,
        value: detail.value,
        sort_order: detail.sort_order,
      })) as never,
    );
    if (detailError) throw detailError;
  }

  return newId;
}

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
    status: "draft",
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

/** Carton dimensions read as L × W × H in the effective unit; blanks collapse to a dash. */
export function cartonDims(
  l: number | null,
  w: number | null,
  h: number | null,
  unit: string,
) {
  if (l == null && w == null && h == null) return "—";
  const part = (value: number | null) => (value == null ? "?" : String(value));
  return `${part(l)} × ${part(w)} × ${part(h)} ${unit}`;
}

export function weightLabel(value: number | null, unit: string) {
  if (value == null) return "—";
  return `${value} ${unit}`;
}

/**
 * DISPLAY ONLY — carton weights always read with 3 decimals (15 → 15.000) so a
 * column of weights aligns. The STORED value is never rewritten by this.
 */
/** Number only — the unit belongs to the dropdown beside the field, never here. */
export function weight3(value: number | null | undefined) {
  if (value == null) return "—";
  return Number(value).toFixed(3);
}

/** Chargeable weight note shares the same 3-decimal display rule. */
export function decimals3(value: number | null | undefined) {
  return value == null ? "—" : Number(value).toFixed(3);
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