/**
 * Proposal currency law: US$ for the origin/CIF bases, BBD$ for the landed
 * Barbados bases. Kept in its own module so both the browser editor and the
 * server snapshot builder can import it without pulling in a client.
 */
import type { Incoterm, PricingCurrency } from "@/lib/pricing-types";

export const CURRENCY_BY_INCOTERM: Record<Incoterm, PricingCurrency> = {
  CIF: "USD",
  FOB: "USD",
  LDF: "BBD",
  LDP: "BBD",
};