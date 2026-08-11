import { queryOptions, useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

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

/** Air lead time in whole days: production + the source's air shipping window. */
export function airLeadDays(
  productionDays: number | null | undefined,
  setting: ShippingSetting,
): Range | null {
  if (productionDays == null) return null;
  return {
    min: productionDays + setting.air_min_days,
    max: productionDays + setting.air_max_days,
  };
}

/**
 * Sea lead time in whole weeks. The low end rounds down and the high end rounds
 * up so the range shown always brackets the real transit window.
 */
export function seaLeadWeeks(
  productionDays: number | null | undefined,
  setting: ShippingSetting,
): Range | null {
  if (productionDays == null) return null;
  return {
    min: Math.floor((productionDays + setting.sea_min_weeks * 7) / 7),
    max: Math.ceil((productionDays + setting.sea_max_weeks * 7) / 7),
  };
}

function formatRange(range: Range | null, unit: "days" | "weeks"): string | null {
  if (!range) return null;
  return range.min === range.max ? `${range.min} ${unit}` : `${range.min}–${range.max} ${unit}`;
}

export type LeadSource = { production_days: number | null; inventory_source: string | null };

export function airLeadLabel(product: LeadSource, map: ShippingMap): string | null {
  return formatRange(airLeadDays(product.production_days, settingFor(map, product.inventory_source)), "days");
}

export function seaLeadLabel(product: LeadSource, map: ShippingMap): string | null {
  return formatRange(seaLeadWeeks(product.production_days, settingFor(map, product.inventory_source)), "weeks");
}

/** Value the "Lead time (air)" filter buckets are measured against. */
export function calculatedAirMin(product: LeadSource, map: ShippingMap): number | null {
  const range = airLeadDays(product.production_days, settingFor(map, product.inventory_source));
  return range ? range.min : null;
}

export const shippingSettingsQuery = queryOptions({
  queryKey: ["shipping-settings"],
  queryFn: async (): Promise<ShippingSetting[]> => {
    const { data, error } = await supabase
      .from("shipping_settings")
      .select("source, air_min_days, air_max_days, sea_min_weeks, sea_max_weeks")
      .order("source", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ShippingSetting[];
  },
});

export function useShippingSettings(): ShippingMap {
  const { data } = useQuery(shippingSettingsQuery);
  return toShippingMap(data);
}
