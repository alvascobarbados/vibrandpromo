/** Public pricing shape shared by the server projection and the customer UI. */
import type { TransportMode } from "@/lib/costing";

export type PublicPriceRow = { qty: number; unitUsd: number };
export type PublicPricingTable = { mode: TransportMode; rows: PublicPriceRow[] };

/** One priced decoration method — the customer "pricing bubble". */
export type PublicDecorationPricing = { methodName: string; tables: PublicPricingTable[] };

/**
 * Display-only packing strings (Task 5). Formatted server-side so no units
 * metadata, supplier identity or raw carton math crosses the boundary.
 */
export type PublicPacking = {
  pcsPerCtn: number;
  ctnDims: string;
  ctnWeight: string;
  volPerCtn: string;
  chargeablePerCtn: string;
};

export type PublicPricing = {
  productId: string;
  tables: PublicPricingTable[];
  decorations: PublicDecorationPricing[];
  packing?: PublicPacking;
};
