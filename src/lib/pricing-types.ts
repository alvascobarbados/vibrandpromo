/** Public pricing shape shared by the server projection and the customer UI. */
import type { TransportMode } from "@/lib/costing";

/** Cost basis. Anon customers only ever see CIF; the rest are staff-only. */
export type Incoterm = "CIF" | "FOB" | "LDF" | "LDP";
export type PricingCurrency = "USD" | "BBD";

/** "origin" is the single ex-works/FOB table — no transport leg. */
export type PricingTableMode = TransportMode | "origin";

export type PublicPriceRow = { qty: number; unit: number };
export type PublicPricingTable = { mode: PricingTableMode; rows: PublicPriceRow[] };

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
  incoterm: Incoterm;
  currency: PricingCurrency;
  tables: PublicPricingTable[];
  decorations: PublicDecorationPricing[];
  packing?: PublicPacking;
};
