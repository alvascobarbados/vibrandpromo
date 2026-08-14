/**
 * Pricelist grouping — PURE NAME-BASED, ported from V3-1's
 * buildSupplierProductDataList.
 *
 * Two products group IFF they share the same normalized name (trim, lowercase,
 * collapse whitespace) AND the same supplier. A null supplier is its own bucket
 * key, so unassigned items never group with a supplier's items. Grouping is a
 * display convenience computed at render time — there is no stored link and no
 * schema behind it, so renaming a product joins/leaves its family on the next
 * render.
 */
import type { Product } from "@/lib/catalog";
import type { SourcingRow } from "@/lib/sourcing";

export type PricelistItem =
  | { type: "card"; product: Product }
  | { type: "group"; parentName: string; supplierId: string | null; members: Product[] };

export function normName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** "Name – VariantLabel" wherever a member is shown. */
export function memberDisplayName(product: Product, sourcing?: SourcingRow | null) {
  const variant = (sourcing?.variant_label ?? "").trim();
  return variant ? `${product.name} – ${variant}` : product.name;
}

export function buildPricelistItems(
  products: Product[],
  sourcingByProduct: Map<string, SourcingRow>,
): PricelistItem[] {
  const supplierOf = (product: Product) =>
    sourcingByProduct.get(product.id)?.supplier_id ?? null;
  const variantOf = (product: Product) =>
    (sourcingByProduct.get(product.id)?.variant_label ?? "").toLowerCase();
  const itemNoOf = (product: Product) =>
    sourcingByProduct.get(product.id)?.supplier_item_no ?? "";

  const buckets = new Map<string, Product[]>();
  for (const product of products) {
    const key = `${supplierOf(product) ?? `none:${product.id}`}::${normName(product.name)}`;
    const list = buckets.get(key) ?? [];
    list.push(product);
    buckets.set(key, list);
  }

  const byVariantThenItem = (a: Product, b: Product) => {
    const av = variantOf(a);
    const bv = variantOf(b);
    if (av !== bv) return av.localeCompare(bv);
    return itemNoOf(a).localeCompare(itemNoOf(b));
  };
  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);

  const items: PricelistItem[] = [];
  const consumed = new Set<string>();

  const groups = Array.from(buckets.values())
    .filter((members) => members.length >= 2)
    .sort((a, b) => (a[0]?.name ?? "").localeCompare(b[0]?.name ?? ""));

  for (const members of groups) {
    const sorted = [...members].sort(byVariantThenItem);
    items.push({
      type: "group",
      parentName: sorted[0]?.name ?? "",
      supplierId: sorted[0] ? supplierOf(sorted[0]) : null,
      members: sorted,
    });
    for (const member of sorted) consumed.add(member.id);
  }

  const standalones = products.filter((product) => !consumed.has(product.id)).sort(byName);
  for (const product of standalones) items.push({ type: "card", product });

  return items;
}
