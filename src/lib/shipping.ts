import { queryOptions, useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toShippingMap, type ShippingMap, type ShippingSetting } from "@/lib/lead-time";

/**
 * The lead-time math itself lives in the dependency-free `lead-time.ts` so
 * server-only proposal snapshots can reuse it verbatim. This module stays the
 * catalogue's entry point, so every existing import keeps working unchanged.
 */
export {
  DEFAULT_SHIPPING_SOURCE,
  FALLBACK_SHIPPING,
  toShippingMap,
  settingFor,
  airLeadDays,
  seaLeadWeeks,
  airLeadLabel,
  seaLeadLabel,
  rushLeadLabel,
  calculatedAirMin,
} from "@/lib/lead-time";
export type { ShippingSetting, ShippingMap, Range, LeadSource } from "@/lib/lead-time";

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
