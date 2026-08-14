import { Plane, Ship } from "lucide-react";

import { ProductImageCarousel } from "@/components/site/ProductImageCarousel";
import { AddToQuoteRow } from "@/components/site/AddToQuoteRow";
import { RushChip } from "@/components/site/RushChip";
import { airAvailable, seaAvailable, type Product } from "@/lib/catalog";
import { airLeadLabel, rushLeadLabel, seaLeadLabel, useShippingSettings } from "@/lib/shipping";
import type { PublicPricing } from "@/lib/pricing-types";

const SPECS: { label: string; key: keyof Product }[] = [
  { label: "Material", key: "material" },
  { label: "Size", key: "size" },
  { label: "Capacity", key: "capacity" },
  { label: "Weight", key: "weight" },
  { label: "Colours", key: "colour_option" },
  { label: "Features", key: "features" },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

/**
 * Expanded (desktop) customer card. Prices are CIF USD unit prices returned by
 * the server — no cost workings, no internal fields, ever.
 */
export function ProductExpandedCard({
  product,
  pricing,
}: {
  product: Product;
  pricing: PublicPricing | undefined;
}) {
  const shipping = useShippingSettings();
  const showAir = airAvailable(product.shipping_methods);
  const showSea = seaAvailable(product.shipping_methods);
  const rush = rushLeadLabel(product, shipping);
  const air = pricing?.tables.find((table) => table.mode === "air");
  const sea = pricing?.tables.find((table) => table.mode === "sea");
  const quantities = Array.from(
    new Set([...(air?.rows ?? []), ...(sea?.rows ?? [])].map((row) => row.qty)),
  ).sort((a, b) => a - b);
  const specs = SPECS.filter((spec) => product[spec.key] != null && product[spec.key] !== "");

  return (
    <article className="@container grid gap-4 overflow-hidden rounded-2xl border border-n-200 bg-white p-3 lg:grid-cols-[220px_1fr_minmax(280px,360px)] lg:gap-6 lg:p-4">
      <div className="overflow-hidden rounded-xl bg-white">
        <ProductImageCarousel images={product.images ?? []} alt={product.name} />
      </div>

      <div className="min-w-0">
        <p className="card-label">{product.sku ?? "—"}</p>
        <h3 className="card-title mt-1 text-base">{product.name}</h3>
        {product.description ? (
          <p className="mt-2 line-clamp-3 text-sm text-n-600">{product.description}</p>
        ) : null}

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="card-label self-center">MOQ</dt>
          <dd className="card-value">{product.moq ?? "—"}</dd>
          {specs.map((spec) => (
            <div key={spec.label} className="col-span-2 grid grid-cols-subgrid">
              <dt className="card-label self-center">{spec.label}</dt>
              <dd className="card-value">{String(product[spec.key])}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 space-y-1 text-sm">
          {rush ? (
            <p className="flex items-center gap-1.5">
              <RushChip />
              <span>{rush}</span>
            </p>
          ) : null}
          {showAir ? (
            <p className="flex items-center gap-1.5">
              <Plane className="size-[13px] text-n-500" strokeWidth={1.75} />
              <span>{airLeadLabel(product, shipping) ?? "—"}</span>
            </p>
          ) : null}
          {showSea ? (
            <p className="flex items-center gap-1.5">
              <Ship className="size-[13px] text-n-500" strokeWidth={1.75} />
              <span>{seaLeadLabel(product, shipping) ?? "—"}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <p className="card-label">Pricing details</p>
        {quantities.length ? (
          <table className="mt-2 w-full text-sm tabular-nums">
            <thead>
              <tr className="card-label">
                <th className="py-1 text-left font-semibold">Qty</th>
                {showAir ? <th className="py-1 text-right font-semibold">Air</th> : null}
                {showSea ? <th className="py-1 text-right font-semibold">Sea</th> : null}
                {rush ? <th className="py-1 text-right font-semibold">Rush</th> : null}
              </tr>
            </thead>
            <tbody>
              {quantities.map((qty) => {
                const airRow = air?.rows.find((row) => row.qty === qty);
                const seaRow = sea?.rows.find((row) => row.qty === qty);
                return (
                  <tr key={qty} className="border-t border-n-200">
                    <td className="py-1">{qty}</td>
                    {showAir ? (
                      <td className="py-1 text-right">{airRow ? money(airRow.unitUsd) : "—"}</td>
                    ) : null}
                    {showSea ? (
                      <td className="py-1 text-right">{seaRow ? money(seaRow.unitUsd) : "—"}</td>
                    ) : null}
                    {rush ? (
                      <td className="py-1 text-right">{airRow ? money(airRow.unitUsd) : "—"}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-n-500">
            Pricing on request — add this item to your quote list.
          </p>
        )}
        <p className="mt-2 text-[11px] text-n-500">
          Unit prices in USD, delivered duty unpaid (CIF). Decoration, duties and local charges are
          confirmed on your quote.
        </p>
        <div className="mt-3">
          <AddToQuoteRow product={product} />
        </div>
      </div>
    </article>
  );
}