/**
 * Server-only proposal work: freezing snapshots at generation and reading a
 * shared proposal back by token.
 *
 * The freeze reuses buildProposalSnapshot — the SAME builder the staff draft
 * preview uses — so the live document and the frozen document are one code
 * path. Nothing customer-unsafe can leak, because the builder is the only thing
 * that ever writes a snapshot.
 */
import { CURRENCY_BY_INCOTERM } from "@/lib/proposal-currency";
import { buildProposalSnapshot, type ProposalSnapshot } from "@/lib/proposal-snapshot";
import { toShippingMap, type ShippingSetting } from "@/lib/lead-time";
import {
  PROPOSAL_SETTINGS_FALLBACK,
  type ProposalSettingsRow,
} from "@/lib/proposal-settings-defaults";
import type { Incoterm } from "@/lib/pricing-types";

/** Only these product columns are ever read for a snapshot. */
const PRODUCT_COLUMNS =
  "id, name, sku, description, images, moq, material, size, capacity, weight, colour_option, features, category_id, subcategory_id, production_min_days, production_max_days, inventory_source, shipping_methods, rush_enabled, rush_production_min_days, rush_production_max_days";

/** url-safe, unguessable, minted once and stable across regenerations. */
export function mintShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function loadProposalSettings(): Promise<ProposalSettingsRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("proposal_settings")
    .select("filename_template, items_per_page, footer_text, validity_days, client_can_export")
    .eq("id", "default")
    .maybeSingle();
  return (data as ProposalSettingsRow | null) ?? PROPOSAL_SETTINGS_FALLBACK;
}

/**
 * Freezes every item's snapshot at the project incoterm and returns how many
 * items were frozen. Pricing is computed server-side through the same
 * projection helper the staff pricing fn uses.
 */
export async function freezeProposal(proposalId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: proposal, error: proposalError } = await supabaseAdmin
    .from("proposals")
    .select("id, incoterm, share_token, status")
    .eq("id", proposalId)
    .maybeSingle();
  if (proposalError) throw new Error(proposalError.message);
  if (!proposal) throw new Error("That proposal no longer exists.");

  const incoterm = (proposal.incoterm as Incoterm) ?? "CIF";
  const currency = CURRENCY_BY_INCOTERM[incoterm];

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("proposal_items")
    .select("id, product_id, position")
    .eq("proposal_id", proposalId)
    .order("position", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);
  if (!items?.length) throw new Error("Add at least one item before generating.");

  const productIds = [...new Set(items.map((item) => item.product_id))];

  const [products, cats, subs, shippingRows, pricing] = await Promise.all([
    supabaseAdmin.from("products").select(PRODUCT_COLUMNS).in("id", productIds),
    supabaseAdmin.from("categories").select("id, name"),
    supabaseAdmin.from("subcategories").select("id, name"),
    supabaseAdmin
      .from("shipping_settings")
      .select("source, air_min_days, air_max_days, sea_min_weeks, sea_max_weeks"),
    import("@/lib/pricing.server").then((module) =>
      module.getPublicPricingFor(productIds, incoterm),
    ),
  ]);

  const productById = new Map((products.data ?? []).map((row) => [row.id, row]));
  const categoryName = new Map((cats.data ?? []).map((row) => [row.id, row.name]));
  const subcategoryName = new Map((subs.data ?? []).map((row) => [row.id, row.name]));
  const shipping = toShippingMap((shippingRows.data ?? []) as ShippingSetting[]);
  const pricingById = new Map(pricing.map((row) => [row.productId, row]));

  let frozen = 0;
  for (const item of items) {
    const product = productById.get(item.product_id);
    if (!product) continue;
    const snapshot: ProposalSnapshot = buildProposalSnapshot({
      product,
      category: product.category_id ? (categoryName.get(product.category_id) ?? null) : null,
      subcategory: product.subcategory_id
        ? (subcategoryName.get(product.subcategory_id) ?? null)
        : null,
      pricing: pricingById.get(product.id) ?? null,
      shipping,
      incoterm,
      currency,
    });
    const { error } = await supabaseAdmin
      .from("proposal_items")
      .update({ snapshot: snapshot as never })
      .eq("id", item.id);
    if (error) throw new Error(error.message);
    frozen += 1;
  }

  const token = proposal.share_token ?? mintShareToken();
  const { error: headError } = await supabaseAdmin
    .from("proposals")
    .update({
      share_token: token,
      status: "generated",
      generated_at: new Date().toISOString(),
      edited_since_generated: false,
    })
    .eq("id", proposalId);
  if (headError) throw new Error(headError.message);

  return { token, frozen, incoterm, currency };
}

export type SharedProposal = {
  clientName: string;
  /** NAME ONLY — a buyer's email and phone never cross this boundary. */
  buyerName: string | null;
  projectName: string;
  incoterm: Incoterm;
  currency: "USD" | "BBD";
  generatedAt: string | null;
  preparedBy: string | null;
  proposalId: string;
  items: Array<{ id: string; snapshot: ProposalSnapshot }>;
  settings: {
    itemsPerPage: number;
    footerText: string;
    validityDays: number;
    clientCanExport: boolean;
    filenameTemplate: string;
  };
};

/** Reads FROZEN snapshots only — never the pricing engine. */
export async function readProposalByToken(token: string): Promise<SharedProposal | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: proposal } = await supabaseAdmin
    .from("proposals")
    .select(
      "id, project_name, incoterm, status, generated_at, created_by_name, clients(name), buyers(name)",
    )
    .eq("share_token", token)
    .eq("status", "generated")
    .maybeSingle();
  if (!proposal) return null;

  const { data: items } = await supabaseAdmin
    .from("proposal_items")
    .select("id, snapshot, position")
    .eq("proposal_id", proposal.id)
    .order("position", { ascending: true });

  const settings = await loadProposalSettings();
  const incoterm = (proposal.incoterm as Incoterm) ?? "CIF";
  const raw = proposal as unknown as {
    clients: { name: string } | null;
    buyers: { name: string } | null;
  };

  return {
    proposalId: proposal.id,
    clientName: raw.clients?.name ?? "—",
    buyerName: raw.buyers?.name ?? null,
    projectName: proposal.project_name,
    incoterm,
    currency: CURRENCY_BY_INCOTERM[incoterm],
    generatedAt: proposal.generated_at,
    preparedBy: proposal.created_by_name ?? null,
    items: (items ?? []).flatMap((item) =>
      item.snapshot ? [{ id: item.id, snapshot: item.snapshot as unknown as ProposalSnapshot }] : [],
    ),
    settings: {
      itemsPerPage: settings.items_per_page,
      footerText: settings.footer_text,
      validityDays: settings.validity_days,
      clientCanExport: settings.client_can_export,
      filenameTemplate: settings.filename_template,
    },
  };
}
