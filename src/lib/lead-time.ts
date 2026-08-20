/**
 * Pure lead-time math. No imports, so both the browser catalogue and
 * server-only modules (proposal snapshots) can share the exact same numbers.
 * `shipping.ts` re-exports everything here — behaviour is unchanged.
 */
export type ShippingSetting = {
  source: string;
  air_min_days: number;
  air_max_days: number;
  sea_min_weeks: number;
  sea_max_weeks: number;
};

export const DEFAULT_SHIPPING_SOURCE = "Factory Direct";

/** Used before the settings load (and if a source is missing a row). */
export const FALLBACK_SHIPPING: ShippingSetting[] = [
  { source: "Factory Direct", air_min_days: 3, air_max_days: 7, sea_min_weeks: 8, sea_max_weeks: 12 },
  { source: "USA Inventory", air_min_days: 2, air_max_days: 5, sea_min_weeks: 3, sea_max_weeks: 4 },
];

export type ShippingMap = Record<string, ShippingSetting>;

export function toShippingMap(rows: ShippingSetting[] | null | undefined): ShippingMap {
  const map: ShippingMap = {};
  for (const row of FALLBACK_SHIPPING) map[row.source] = row;
  for (const row of rows ?? []) map[row.source] = row;
  return map;
}

/** A missing or unknown inventory source falls back to Factory Direct. */
export function settingFor(map: ShippingMap, source: string | null | undefined): ShippingSetting {
  return (
    map[source ?? ""] ??
    map[DEFAULT_SHIPPING_SOURCE] ??
    (FALLBACK_SHIPPING[0] as ShippingSetting)
  );
}

export type Range = { min: number; max: number };

/** Air freight is offered unless the product is sea-only or has no method set. */
function airOffered(value: string | null | undefined) {
  return value != null && value !== "sea_only";
}

/**
 * Production time may be fixed (min only) or a range. A blank maximum means the
 * maximum equals the minimum.
 */
function productionRange(
  min: number | null | undefined,
  max: number | null | undefined,
): Range | null {
  if (min == null) return null;
  return { min, max: max == null ? min : max };
}

/** Air lead time in whole days: production + the source's air shipping window. */
export function airLeadDays(
  productionMin: number | null | undefined,
  productionMax: number | null | undefined,
  setting: ShippingSetting,
): Range | null {
  const production = productionRange(productionMin, productionMax);
  if (!production) return null;
  return {
    min: production.min + setting.air_min_days,
    max: production.max + setting.air_max_days,
  };
}

/**
 * Sea lead time in whole weeks. The low end rounds down and the high end rounds
 * up so the range shown always brackets the real transit window.
 */
export function seaLeadWeeks(
  productionMin: number | null | undefined,
  productionMax: number | null | undefined,
  setting: ShippingSetting,
): Range | null {
  const production = productionRange(productionMin, productionMax);
  if (!production) return null;
  return {
    min: Math.floor((production.min + setting.sea_min_weeks * 7) / 7),
    max: Math.ceil((production.max + setting.sea_max_weeks * 7) / 7),
  };
}

function formatRange(range: Range | null, unit: "days" | "wks"): string | null {
  if (!range) return null;
  return range.min === range.max ? `${range.min} ${unit}` : `${range.min}–${range.max} ${unit}`;
}

export type LeadSource = {
  production_min_days: number | null;
  production_max_days?: number | null;
  inventory_source: string | null;
  shipping_methods?: string | null;
  rush_enabled?: boolean | null;
  rush_production_min_days?: number | null;
  rush_production_max_days?: number | null;
};

export function airLeadLabel(product: LeadSource, map: ShippingMap): string | null {
  return formatRange(
    airLeadDays(
      product.production_min_days,
      product.production_max_days ?? null,
      settingFor(map, product.inventory_source),
    ),
    "days",
  );
}

export function seaLeadLabel(product: LeadSource, map: ShippingMap): string | null {
  return formatRange(
    seaLeadWeeks(
      product.production_min_days,
      product.production_max_days ?? null,
      settingFor(map, product.inventory_source),
    ),
    "wks",
  );
}

/**
 * Rush is an alternative production time, not a different shipping method: it
 * uses the same air shipping buffer as the normal air lead time.
 */
export function rushLeadLabel(product: LeadSource, map: ShippingMap): string | null {
  if (!product.rush_enabled) return null;
  if (!airOffered(product.shipping_methods)) return null;
  return formatRange(
    airLeadDays(
      product.rush_production_min_days ?? null,
      product.rush_production_max_days ?? null,
      settingFor(map, product.inventory_source),
    ),
    "days",
  );
}

/** Value the "Lead time (air)" filter buckets are measured against. */
export function calculatedAirMin(product: LeadSource, map: ShippingMap): number | null {
  // Sea-only products have no air lead time, so they can never match an air bucket.
  if (!airOffered(product.shipping_methods)) return null;
  const range = airLeadDays(
    product.production_min_days,
    product.production_max_days ?? null,
    settingFor(map, product.inventory_source),
  );
  return range ? range.min : null;
}