/** Public pricing shape shared by the server projection and the customer UI. */
import type { TransportMode } from "@/lib/costing";

export type PublicPriceRow = { qty: number; unitUsd: number };
export type PublicPricingTable = { mode: TransportMode; rows: PublicPriceRow[] };
export type PublicPricing = { productId: string; tables: PublicPricingTable[] };
