/**
 * Customer pricing (server-only).
 *
 * Runs the same costing engine staff see, then throws away everything except
 * quantity + CIF unit price in USD. No BBD, no FOB, no freight workings, no
 * duty, no supplier data ever leaves this file.
 *
 * The costing tables are staff-only by RLS and must stay that way, so the read
 * happens with the privileged client INSIDE this server-only module and the
 * response is projected down to the public shape before returning.
 */
import { computeProductCalc, type RouteInput, type Settings } from "@/lib/calcEngine";
import {
  calcProductInput,
  calcRoutes,
  calcSettings,
  dutyDecimal,
  num,
} from "@/lib/costing-adapter";
import type { ProductDecoration } from "@/lib/decorations";
import type { SourcingRow, Supplier } from "@/lib/sourcing";
import type { TransportMode } from "@/lib/costing";

export type PublicPriceRow = { qty: number; unitUsd: number };
export type PublicPricingTable = { mode: TransportMode; rows: PublicPriceRow[] };
export type PublicPricing = { productId: string; tables: PublicPricingTable[] };

/** Cheapest CIF unit price per quantity row, per transport mode. */
function tablesFrom(
  calc: ReturnType<typeof computeProductCalc>,
  routes: RouteInput[],
  modeByRouteId: Map<string, TransportMode>,
): PublicPricingTable[] {
  const modes: TransportMode[] = ["air", "sea"];
  const tables: PublicPricingTable[] = [];
  for (const mode of modes) {
    const ids = routes.filter((route) => modeByRouteId.get(route.id) === mode).map((r) => r.id);
    if (!ids.length) continue;
    const rows: PublicPriceRow[] = [];
    for (const row of calc.rows) {
      let best: number | null = null;
      for (const id of ids) {
        const cell = row.transports[id];
        if (!cell || !cell.active) continue;
        const unit = cell.cifUnitUsd.amount;
        if (!Number.isFinite(unit) || unit <= 0) continue;
        if (best == null || unit < best) best = unit;
      }
      if (best != null) rows.push({ qty: row.spec.qty, unitUsd: Math.round(best * 100) / 100 });
    }
    if (rows.length) tables.push({ mode, rows });
  }
  return tables;
}

export async function getPublicPricingFor(productIds: string[]): Promise<PublicPricing[]> {
  if (!productIds.length) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [products, sourcing, suppliers, origins, settingsRows, methods, routeRows, tiers, dests, decorations, cats, subs] =
    await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, category_id, subcategory_id, status")
        .in("id", productIds)
        .eq("status", "live"),
      supabaseAdmin
        .from("product_sourcing")
        .select(
          "id, product_id, supplier_id, supplier_item_no, supplier_item_name, variant_label, carton_pack, carton_length, carton_width, carton_height, carton_weight, dimension_unit, weight_unit",
        )
        .in("product_id", productIds),
      supabaseAdmin.from("suppliers").select("id, unit_system, origin_id"),
      supabaseAdmin.from("origins").select("id, code"),
      supabaseAdmin.from("app_settings").select("id, section, key, value, value_type, display_label, display_order, description"),
      supabaseAdmin
        .from("shipping_methods")
        .select("id, code, fuel_surcharge_pct, buffer_pct, chargeable_metric, chargeable_unit, transport_mode"),
      supabaseAdmin
        .from("shipping_method_routes")
        .select(
          "id, shipping_method_id, origin_id, destination_id, fixed_cost, lac_fixed_bbd, lac_per_cbm_bbd, include_inland_freight",
        ),
      supabaseAdmin.from("shipping_method_tiers").select("route_id, band_from, band_to, rate"),
      supabaseAdmin.from("destinations").select("id, code"),
      supabaseAdmin
        .from("product_decorations")
        .select(
          "id, product_id, method_detail_id, sort_order, updated_at, notes, ref_image_url, product_decoration_bands(id, product_decoration_id, qty, unit_cost, setup_cost, inland_freight_usd)",
        )
        .in("product_id", productIds),
      supabaseAdmin.from("categories").select("id, duty_rate_pct"),
      supabaseAdmin.from("subcategories").select("id, duty_rate_pct"),
    ]);

  if (!products.data?.length) return [];

  const settings: Settings = calcSettings((settingsRows.data ?? []) as never);
  const routes = calcRoutes({
    methods: (methods.data ?? []) as never,
    routes: (routeRows.data ?? []) as never,
    tiers: (tiers.data ?? []) as never,
    origins: (origins.data ?? []) as never,
    destinations: (dests.data ?? []) as never,
  });
  const modeByMethod = new Map(
    (methods.data ?? []).map((method) => [method.id, method.transport_mode as TransportMode]),
  );
  const modeByRouteId = new Map<string, TransportMode>();
  for (const route of routeRows.data ?? []) {
    const mode = modeByMethod.get(route.shipping_method_id);
    if (mode) modeByRouteId.set(route.id, mode);
  }

  const sourcingByProduct = new Map(
    (sourcing.data ?? []).map((row) => [row.product_id, row as unknown as SourcingRow]),
  );
  const supplierById = new Map(
    (suppliers.data ?? []).map((row) => [row.id, row as unknown as Supplier]),
  );
  const originById = new Map((origins.data ?? []).map((row) => [row.id, row.code]));
  const dutyCategory = new Map((cats.data ?? []).map((row) => [row.id, num(row.duty_rate_pct)]));
  const dutySubcategory = new Map((subs.data ?? []).map((row) => [row.id, num(row.duty_rate_pct)]));
  const decorationsByProduct = new Map<string, ProductDecoration[]>();
  for (const decoration of (decorations.data ?? []) as unknown as ProductDecoration[]) {
    const list = decorationsByProduct.get(decoration.product_id) ?? [];
    list.push(decoration);
    decorationsByProduct.set(decoration.product_id, list);
  }

  const out: PublicPricing[] = [];
  for (const product of products.data) {
    const row = sourcingByProduct.get(product.id) ?? null;
    const supplier = row?.supplier_id ? supplierById.get(row.supplier_id) ?? null : null;
    const originCode = supplier?.origin_id ? originById.get(supplier.origin_id) ?? null : null;
    const input = calcProductInput({
      productId: product.id,
      sourcing: row,
      supplier,
      originCode,
      decorations: decorationsByProduct.get(product.id) ?? [],
      dutyRate: dutyDecimal(
        product.subcategory_id ? dutySubcategory.get(product.subcategory_id) ?? null : null,
        product.category_id ? dutyCategory.get(product.category_id) ?? null : null,
      ),
    });
    if (!input) continue;
    const calc = computeProductCalc(input, routes, settings);
    const tables = tablesFrom(calc, routes, modeByRouteId);
    if (tables.length) out.push({ productId: product.id, tables });
  }
  return out;
}