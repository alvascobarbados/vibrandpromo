/**
 * The frozen, customer-safe proposal payload — and the ONE builder that
 * produces it. Dependency-free on purpose: the staff editor renders a live
 * preview from it and the server writes the identical shape at generation.
 *
 * Everything here is publication-safe: product name, sku, catalogue image path,
 * spec label/value strings, MOQ, lead-time labels, decoration method names and
 * {qty, unit} tier rows. Supplier identity, item numbers, bands, route
 * internals and costs are never included.
 */
import type { Incoterm, PricingCurrency, PublicPricingTable } from "@/lib/pricing-types";
import {
  airLeadLabel,
  rushLeadLabel,
  seaLeadLabel,
  type ShippingMap,
  type LeadSource,
} from "@/lib/lead-time";

export type ProposalLeadLabel = { mode: "air" | "sea" | "rush"; label: string };

export type ProposalSnapshot = {
  name: string;
  sku: string | null;
  /** Customer-facing product description — already public on the shop. */
  description: string | null;
  /** Up to four customer-safe catalogue image paths — hero first. */
  images: string[];
  category: string | null;
  subcategory: string | null;
  specs: Array<{ label: string; value: string }>;
  moq: number | null;
  leadLabels: ProposalLeadLabel[];
  incoterm: Incoterm;
  currency: PricingCurrency;
  decorations: Array<{ methodName: string; tables: PublicPricingTable[] }>;
};

/** Only these product fields ever become proposal spec lines. */
const SPEC_FIELDS = [
  { key: "material", label: "Material" },
  { key: "size", label: "Size" },
  { key: "capacity", label: "Capacity" },
  { key: "weight", label: "Weight" },
  { key: "colour_option", label: "Colours" },
  { key: "features", label: "Features" },
] as const;

export type SnapshotProduct = LeadSource & {
  name: string;
  sku: string | null;
  description?: string | null;
  images: string[] | null;
  moq: number | null;
  material?: string | null;
  size?: string | null;
  capacity?: string | null;
  weight?: string | null;
  colour_option?: string | null;
  features?: string | null;
};

export type SnapshotPricing = {
  incoterm: Incoterm;
  currency: PricingCurrency;
  tables: PublicPricingTable[];
  decorations: Array<{ methodName: string; tables: PublicPricingTable[] }>;
};

function airOffered(value: string | null | undefined) {
  return value != null && value !== "sea_only";
}

function seaOffered(value: string | null | undefined) {
  return value != null && value !== "air_only";
}

export function buildProposalSnapshot({
  product,
  category,
  subcategory,
  pricing,
  shipping,
  incoterm,
  currency,
}: {
  product: SnapshotProduct;
  category: string | null;
  subcategory: string | null;
  pricing: SnapshotPricing | null | undefined;
  shipping: ShippingMap;
  incoterm: Incoterm;
  currency: PricingCurrency;
}): ProposalSnapshot {
  const specs: Array<{ label: string; value: string }> = [];
  for (const field of SPEC_FIELDS) {
    const value = (product as Record<string, unknown>)[field.key];
    if (typeof value === "string" && value.trim()) {
      specs.push({ label: field.label, value: value.trim() });
    }
  }

  const leadLabels: ProposalLeadLabel[] = [];
  const air = airLeadLabel(product, shipping);
  const sea = seaLeadLabel(product, shipping);
  const rush = rushLeadLabel(product, shipping);
  if (air && airOffered(product.shipping_methods)) leadLabels.push({ mode: "air", label: air });
  if (sea && seaOffered(product.shipping_methods)) leadLabels.push({ mode: "sea", label: sea });
  if (rush) leadLabels.push({ mode: "rush", label: rush });

  // One bubble per priced decoration; an undecorated product falls back to its
  // plain tier table under a neutral label — exactly like the catalogue card.
  const decorations = pricing?.decorations?.length
    ? pricing.decorations
    : pricing?.tables?.length
      ? [{ methodName: "Blank / undecorated", tables: pricing.tables }]
      : [];

  return {
    name: product.name,
    sku: product.sku ?? null,
    description: product.description?.trim() ? product.description.trim() : null,
    images: (product.images ?? []).filter(Boolean).slice(0, 4),
    category,
    subcategory,
    specs,
    moq: product.moq ?? null,
    leadLabels,
    incoterm,
    currency,
    decorations,
  };
}

/** Every quantity tier across a snapshot's methods, so columns line up. */
export function unifiedTiers(snapshot: Pick<ProposalSnapshot, "decorations">) {
  return Array.from(
    new Set(
      snapshot.decorations.flatMap((bubble) =>
        bubble.tables.flatMap((table) => table.rows.map((row) => row.qty)),
      ),
    ),
  ).sort((a, b) => a - b);
}