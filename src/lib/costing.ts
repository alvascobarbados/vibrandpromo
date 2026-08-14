import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AppSetting = {
  id: string;
  section: string;
  key: string;
  value: string | null;
  value_type: string;
  display_label: string | null;
  display_order: number;
  description: string | null;
};

export type ShippingMethodRow = {
  id: string;
  code: string;
  name: string;
  notes: string | null;
  fuel_surcharge_pct: number;
  buffer_pct: number;
  chargeable_metric: string;
  chargeable_unit: string;
};

export type RouteRow = {
  id: string;
  shipping_method_id: string;
  origin_id: string;
  destination_id: string;
  fixed_cost: number;
  lac_fixed_bbd: number;
  lac_per_cbm_bbd: number;
  include_inland_freight: boolean;
  notes: string | null;
};

export type TierRow = {
  id: string;
  route_id: string;
  band_from: number;
  band_to: number | null;
  rate: number;
  notes: string | null;
};

export type DestinationRow = { id: string; code: string; name: string; notes: string | null };
export type OriginRow = { id: string; code: string; name: string };
export type RoundingRuleRow = {
  id: string;
  band_min: number;
  band_max: number | null;
  round_up_to: number;
  description: string | null;
  display_order: number;
};
export type DetailLabelRow = { id: string; label: string; sort_order: number };

export const CHARGEABLE_METRICS = [
  "ACTUAL_WEIGHT",
  "VOLUMETRIC_WEIGHT",
  "CHARGEABLE_WEIGHT",
  "VOLUME",
] as const;

export const SECTION_ORDER = [
  "Currency & FX",
  "Freight",
  "Conversions",
  "Customs & Duty",
  "Pricing Defaults",
];

export const appSettingsQuery = queryOptions({
  queryKey: ["costing", "app_settings"],
  queryFn: async (): Promise<AppSetting[]> => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("id, section, key, value, value_type, display_label, display_order, description")
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AppSetting[];
  },
});

export const shippingMethodsQuery = queryOptions({
  queryKey: ["costing", "shipping_methods"],
  queryFn: async (): Promise<ShippingMethodRow[]> => {
    const { data, error } = await supabase
      .from("shipping_methods")
      .select(
        "id, code, name, notes, fuel_surcharge_pct, buffer_pct, chargeable_metric, chargeable_unit",
      )
      .order("code", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ShippingMethodRow[];
  },
});

export const shippingRoutesQuery = queryOptions({
  queryKey: ["costing", "shipping_method_routes"],
  queryFn: async (): Promise<RouteRow[]> => {
    const { data, error } = await supabase
      .from("shipping_method_routes")
      .select(
        "id, shipping_method_id, origin_id, destination_id, fixed_cost, lac_fixed_bbd, lac_per_cbm_bbd, include_inland_freight, notes",
      )
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as RouteRow[];
  },
});

export const shippingTiersQuery = queryOptions({
  queryKey: ["costing", "shipping_method_tiers"],
  queryFn: async (): Promise<TierRow[]> => {
    const { data, error } = await supabase
      .from("shipping_method_tiers")
      .select("id, route_id, band_from, band_to, rate, notes")
      .order("band_from", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as TierRow[];
  },
});

export const destinationsQuery = queryOptions({
  queryKey: ["costing", "destinations"],
  queryFn: async (): Promise<DestinationRow[]> => {
    const { data, error } = await supabase
      .from("destinations")
      .select("id, code, name, notes")
      .order("code", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DestinationRow[];
  },
});

export const originsListQuery = queryOptions({
  queryKey: ["costing", "origins"],
  queryFn: async (): Promise<OriginRow[]> => {
    const { data, error } = await supabase
      .from("origins")
      .select("id, code, name")
      .order("code", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as OriginRow[];
  },
});

export const roundingRulesQuery = queryOptions({
  queryKey: ["costing", "rounding_rules"],
  queryFn: async (): Promise<RoundingRuleRow[]> => {
    const { data, error } = await supabase
      .from("rounding_rules")
      .select("id, band_min, band_max, round_up_to, description, display_order")
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as RoundingRuleRow[];
  },
});

export const detailLabelsAdminQuery = queryOptions({
  queryKey: ["costing", "detail_labels"],
  queryFn: async (): Promise<DetailLabelRow[]> => {
    const { data, error } = await supabase
      .from("detail_labels")
      .select("id, label, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DetailLabelRow[];
  },
});

export const detailLabelUsageQuery = queryOptions({
  queryKey: ["costing", "detail_label_usage"],
  queryFn: async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase.from("product_details").select("detail_label_id");
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as { detail_label_id: string }[]) {
      counts[row.detail_label_id] = (counts[row.detail_label_id] ?? 0) + 1;
    }
    return counts;
  },
});

export const categoryDutyQuery = queryOptions({
  queryKey: ["costing", "category_duty"],
  queryFn: async (): Promise<{
    categories: Record<string, number | null>;
    subcategories: Record<string, number | null>;
  }> => {
    const [cats, subs] = await Promise.all([
      supabase.from("categories").select("id, duty_rate_pct"),
      supabase.from("subcategories").select("id, duty_rate_pct"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (subs.error) throw new Error(subs.error.message);
    const map = (rows: { id: string; duty_rate_pct: number | null }[]) =>
      Object.fromEntries(rows.map((row) => [row.id, row.duty_rate_pct]));
    return {
      categories: map((cats.data ?? []) as { id: string; duty_rate_pct: number | null }[]),
      subcategories: map((subs.data ?? []) as { id: string; duty_rate_pct: number | null }[]),
    };
  },
});

/** Returns amber warnings for overlapping or gapped tier ladders. Never blocks. */
export function tierLadderWarnings(tiers: TierRow[]): string[] {
  const sorted = [...tiers].sort((a, b) => a.band_from - b.band_from);
  const warnings: string[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    if (current.band_to === null) {
      warnings.push(`Open-ended band from ${current.band_from} overlaps later bands.`);
      continue;
    }
    if (next.band_from < current.band_to) {
      warnings.push(`Bands overlap between ${current.band_from} and ${next.band_from}.`);
    } else if (next.band_from > current.band_to) {
      warnings.push(`Gap between ${current.band_to} and ${next.band_from}.`);
    }
  }
  return warnings;
}
