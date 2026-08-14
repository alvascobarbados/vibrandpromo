/**
 * COSTING GATE — the single source of truth for "does this product have enough
 * data for the costing engine to price it?". Ported from V3-1's productLiveGate
 * (same required-field semantics, our column names).
 *
 * Imported by:
 *   - the /team Pricelist row badge (display)
 *   - the /team "Costing ready / Incomplete" filter (URL state)
 *   - the costing engine's eligibility predicate (later)
 *
 * There is exactly ONE copy of these rules. It deliberately says nothing about
 * customer visibility: `status` / `show_price` stay independent of it.
 */

export type MissingField = { key: string; label: string };

export type GateProduct = {
  name?: string | null;
  subcategory_id?: string | null;
  production_min_days?: number | null;
};

export type GateSourcing = {
  supplier_id?: string | null;
  carton_pack?: number | null;
  carton_length?: number | string | null;
  carton_width?: number | string | null;
  carton_height?: number | string | null;
  carton_weight?: number | string | null;
} | null;

function blank(value: number | string | null | undefined) {
  return value == null || value === "";
}

/** The missing-field list, in a stable order, using human labels (not keys). */
export function costingReadyMissing(
  product: GateProduct,
  sourcing: GateSourcing,
): MissingField[] {
  const missing: MissingField[] = [];
  if (!sourcing?.supplier_id) missing.push({ key: "supplier", label: "Supplier" });
  if (!product.subcategory_id)
    missing.push({ key: "subcategory", label: "Category / Subcategory" });
  if (!product.name || product.name.trim().length === 0)
    missing.push({ key: "name", label: "Product name" });
  if (
    product.production_min_days == null ||
    !Number.isFinite(product.production_min_days) ||
    product.production_min_days < 0
  ) {
    missing.push({ key: "production_min_days", label: "Lead time (min days)" });
  }
  if (blank(sourcing?.carton_pack)) missing.push({ key: "carton_pack", label: "Carton pack" });
  if (blank(sourcing?.carton_length))
    missing.push({ key: "carton_length", label: "Carton length" });
  if (blank(sourcing?.carton_width)) missing.push({ key: "carton_width", label: "Carton width" });
  if (blank(sourcing?.carton_height))
    missing.push({ key: "carton_height", label: "Carton height" });
  if (blank(sourcing?.carton_weight))
    missing.push({ key: "carton_weight", label: "Carton weight" });
  return missing;
}

export function costingReady(product: GateProduct, sourcing: GateSourcing) {
  return costingReadyMissing(product, sourcing).length === 0;
}

export const READY_FILTER_OPTIONS = [
  { value: "ready", label: "Costing ready" },
  { value: "incomplete", label: "Incomplete" },
] as const;

/** Filter predicate shared by the sidebar counts and the list itself. */
export function matchesReadyFilter(
  values: string[],
  product: GateProduct,
  sourcing: GateSourcing,
) {
  if (values.length === 0) return true;
  const ready = costingReady(product, sourcing);
  return values.includes(ready ? "ready" : "incomplete");
}
