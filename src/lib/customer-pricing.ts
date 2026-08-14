import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";

import { getCustomerPricing } from "@/lib/pricing.functions";
import type { PublicPricing } from "@/lib/pricing-types";

/**
 * Customer-safe unit prices (CIF USD) for the products currently on screen.
 * Only fetched for the visible page, and only when the expanded layout is on.
 */
export function useCustomerPricing(productIds: string[], enabled: boolean) {
  const fetchPricing = useServerFn(getCustomerPricing);
  const query = useQuery({
    queryKey: ["customer-pricing", productIds],
    queryFn: () => fetchPricing({ data: { productIds } }),
    enabled: enabled && productIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(
    () => new Map<string, PublicPricing>((query.data ?? []).map((row) => [row.productId, row])),
    [query.data],
  );
}