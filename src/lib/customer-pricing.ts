import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";

import { getCustomerPricing, getStaffPricing } from "@/lib/pricing.functions";
import type { Incoterm, PublicPricing } from "@/lib/pricing-types";

/**
 * Unit prices for the products currently on screen. CIF always goes through
 * the public function; any other incoterm is staff-only and goes through the
 * authenticated one.
 */
export function useCustomerPricing(
  productIds: string[],
  enabled: boolean,
  incoterm: Incoterm = "CIF",
) {
  const fetchPublic = useServerFn(getCustomerPricing);
  const fetchStaff = useServerFn(getStaffPricing);
  const query = useQuery({
    queryKey: ["customer-pricing", incoterm, productIds],
    queryFn: () =>
      incoterm === "CIF"
        ? fetchPublic({ data: { productIds } })
        : fetchStaff({ data: { productIds, incoterm } }),
    enabled: enabled && productIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(
    () => new Map<string, PublicPricing>((query.data ?? []).map((row) => [row.productId, row])),
    [query.data],
  );
}