import { useQuery } from "@tanstack/react-query";

import { specValue, type Product } from "@/lib/catalog";
import { productSourcingQuery, supplierLabel, suppliersQuery } from "@/lib/sourcing";

/**
 * Internal-only panel appended to ProductCard in the supplier workspace. It is a
 * slot on the shared card, never a second card implementation, so the
 * customer-facing card markup above it stays byte-identical.
 */
function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="card-label !text-white/50">{label}</span>
      <span className={`text-[13px] ${value ? "text-white" : "text-white/40"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function productionRange(product: Product) {
  const min = product.production_min_days;
  const max = product.production_max_days;
  if (min == null) return null;
  return max == null ? `${min} days` : `${min}–${max} days`;
}

function rushRange(product: Product) {
  if (!product.rush_enabled) return null;
  const min = product.rush_production_min_days;
  const max = product.rush_production_max_days;
  if (min == null) return null;
  return max == null ? `${min} days` : `${min}–${max} days`;
}

export function ProductTeamDetails({ product }: { product: Product }) {
  const suppliers = useQuery(suppliersQuery);
  const sourcing = useQuery(productSourcingQuery);
  const row = (sourcing.data ?? []).find((item) => item.product_id === product.id) ?? null;
  const supplier = (suppliers.data ?? []).find((item) => item.id === row?.supplier_id) ?? null;

  const specs: [string, string | null][] = [
    ["Material", product.material],
    ["Size", product.size],
    ["Capacity", product.capacity],
    ["Weight", product.weight],
  ];

  return (
    <div className="mt-auto space-y-2 border-t border-black/20 bg-n-700 p-3">
      <p className="card-label !text-white/50">Internal</p>
      <Row label="Supplier" value={supplier ? supplierLabel(supplier) : null} />
      <Row label="Item no." value={row?.supplier_item_no ?? null} />
      <Row label="Production" value={productionRange(product)} />
      {product.rush_enabled ? <Row label="Rush" value={rushRange(product)} /> : null}
      <Row label="MOQ" value={product.moq == null ? null : specValue(product.moq)} />
      {specs
        .filter(([, value]) => Boolean(value))
        .map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="card-label rounded-full bg-white/10 px-2 py-0.5 !text-white/80">
          {product.inventory_source}
        </span>
        {!product.is_active ? (
          <span className="card-label rounded-full bg-white/10 px-2 py-0.5 !text-white/80">
            Hidden
          </span>
        ) : null}
        {product.is_featured ? (
          <span className="card-label rounded-full bg-lime-500 px-2 py-0.5 !text-n-700">
            Featured
          </span>
        ) : null}
        {!supplier ? (
          <span className="card-label rounded-full bg-white/10 px-2 py-0.5 !text-white/60">
            No supplier
          </span>
        ) : null}
      </div>
    </div>
  );
}