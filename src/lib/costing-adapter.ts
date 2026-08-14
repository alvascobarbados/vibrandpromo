/**
 * Vibrand adapter for the ported costing engine (src/lib/calcEngine.ts).
 *
 * The engine stays generic and pure: this file is the ONLY place that knows
 * about our schema (app_settings, shipping_methods/routes/tiers, origins,
 * destinations, product_sourcing, suppliers, product_decorations + bands,
 * category/subcategory duty). Nothing here does math the engine already owns.
 */
import type { AppSetting } from "@/lib/costing";
import type {
  ChargeableMetric,
  PricingTier,
  ProductInput,
  RouteInput,
  Settings,
} from "@/lib/calcEngine";
import type { DecorationBand, ProductDecoration } from "@/lib/decorations";
import type { SourcingRow, Supplier } from "@/lib/sourcing";
import { effectiveUnits } from "@/lib/units";

/** null/""/non-finite → null, NEVER 0 (the engine treats null as invalid data). */
export function num(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const SETTINGS_FALLBACK: Settings = {
  fxBbdPerUsdBase: 2.02768,
  fxFeePct: 0.02,
  customsMultiplier: 2,
  dvf: 1,
  kgToLbs: 2.20462,
  cbmDivisor: 1_000_000,
  volumetricDivisor: 200,
  inToCm: 2.54,
};

/** app_settings rows → engine Settings. Percent points are divided by 100 here. */
export function calcSettings(rows: AppSetting[] | undefined): Settings {
  const map = new Map((rows ?? []).map((row) => [row.key, num(row.value)] as const));
  const pick = (key: string, fallback: number) => map.get(key) ?? fallback;
  return {
    fxBbdPerUsdBase: pick("fx_rate_usd_bbd", SETTINGS_FALLBACK.fxBbdPerUsdBase),
    fxFeePct: pick("fx_fee_pct", 2) / 100,
    customsMultiplier: pick("customs_multiplier", SETTINGS_FALLBACK.customsMultiplier),
    dvf: pick("dvf", SETTINGS_FALLBACK.dvf),
    kgToLbs: pick("conversions_kg_to_lbs", SETTINGS_FALLBACK.kgToLbs),
    cbmDivisor: pick("conversions_cbm_divisor", SETTINGS_FALLBACK.cbmDivisor),
    volumetricDivisor: pick(
      "conversions_volumetric_divisor",
      SETTINGS_FALLBACK.volumetricDivisor,
    ),
    inToCm: pick("conversions_in_to_cm", SETTINGS_FALLBACK.inToCm),
  };
}

/** Chargeable unit strings are stored uppercase here; the engine reads 'lbs'/'kg'/'CBM'. */
function engineUnit(unit: string): string {
  const upper = unit.trim().toUpperCase();
  if (upper === "LBS" || upper === "LB") return "lbs";
  if (upper === "KG") return "kg";
  return upper;
}

export type RouteSources = {
  methods: {
    id: string;
    code: string;
    fuel_surcharge_pct: number;
    buffer_pct: number;
    chargeable_metric: string;
    chargeable_unit: string;
  }[];
  routes: {
    id: string;
    shipping_method_id: string;
    origin_id: string;
    destination_id: string;
    fixed_cost: number;
    lac_fixed_bbd: number;
    lac_per_cbm_bbd: number;
    include_inland_freight: boolean;
  }[];
  tiers: { route_id: string; band_from: number; band_to: number | null; rate: number }[];
  origins: { id: string; code: string }[];
  destinations: { id: string; code: string }[];
};

/** Courier-style methods sort before ocean so route columns never reshuffle. */
function methodRank(code: string) {
  return code.trim().toUpperCase().startsWith("OCEAN") ? 2 : 1;
}

/** Costing tables → engine RouteInput[], in one deterministic global order. */
export function calcRoutes(sources: RouteSources): RouteInput[] {
  const methodById = new Map(sources.methods.map((m) => [m.id, m]));
  const originById = new Map(sources.origins.map((o) => [o.id, o]));
  const destById = new Map(sources.destinations.map((d) => [d.id, d]));

  return sources.routes
    .map((route): RouteInput | null => {
      const method = methodById.get(route.shipping_method_id);
      const origin = originById.get(route.origin_id);
      const destination = destById.get(route.destination_id);
      if (!method || !origin || !destination) return null;
      return {
        id: route.id,
        code: `${method.code}-${origin.code}-${destination.code}`,
        methodCode: method.code,
        chargeableMetric: (method.chargeable_metric as ChargeableMetric) ?? "CHARGEABLE_WEIGHT",
        chargeableUnit: engineUnit(method.chargeable_unit ?? "LBS"),
        origin: origin.code,
        destination: destination.code,
        // NULL fixed_cost stays null → the engine flags the route invalid.
        baseFeeUsd: num(route.fixed_cost),
        fuelPct: (num(method.fuel_surcharge_pct) ?? 0) / 100,
        bufferPct: (num(method.buffer_pct) ?? 0) / 100,
        lacFixedBbd: num(route.lac_fixed_bbd) ?? 0,
        lacPerCbmBbd: num(route.lac_per_cbm_bbd) ?? 0,
        includeInlandFreight: route.include_inland_freight === true,
        tiers: sources.tiers
          .filter((tier) => tier.route_id === route.id)
          .map((tier) => ({
            from: num(tier.band_from) ?? 0,
            to: tier.band_to == null ? null : num(tier.band_to),
            rateUsd: num(tier.rate),
          }))
          .sort((a, b) => a.from - b.from),
        sortOrder: methodRank(method.code) * 1000,
      };
    })
    .filter((route): route is RouteInput => route !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    .map((route, index) => ({ ...route, sortOrder: index }));
}

/**
 * Duty: the subcategory rate wins; a NULL subcategory rate inherits the
 * category's (the same inheritance the Categories page shows). Both NULL means
 * "not set" — the engine then flags dutyMissing instead of billing 0%.
 */
export function dutyDecimal(
  subcategoryRate: number | null | undefined,
  categoryRate: number | null | undefined,
): number | null {
  const raw = num(subcategoryRate) ?? num(categoryRate);
  return raw == null ? null : raw / 100;
}

/** Distinct quantity bands across every decoration, cheapest-first by qty. */
export function pricingTiersFrom(decorations: ProductDecoration[]): PricingTier[] {
  const tiers: PricingTier[] = [];
  const seen = new Set<number>();
  const bands: DecorationBand[] = decorations.flatMap(
    (decoration) => decoration.product_decoration_bands ?? [],
  );
  for (const band of bands) {
    const qty = num(band.qty);
    if (qty == null || seen.has(qty)) continue;
    seen.add(qty);
    tiers.push({
      qty,
      unitUsd: num(band.unit_cost) ?? 0,
      setupUsd: num(band.setup_cost) ?? 0,
      inlandFreightUsd: num(band.inland_freight_usd),
    });
  }
  return tiers.sort((a, b) => a.qty - b.qty);
}

export type ProductCalcSources = {
  productId: string;
  sourcing: SourcingRow | null;
  supplier: Supplier | null;
  originCode: string | null;
  decorations: ProductDecoration[];
  dutyRate: number | null;
};

/**
 * Returns null when the product is not costable yet (no origin, missing carton
 * specs, or no pricing band). Callers render an explicit "missing data" state —
 * never a zero.
 */
export function calcProductInput(sources: ProductCalcSources): ProductInput | null {
  const { sourcing, supplier, originCode, decorations } = sources;
  if (!originCode || !sourcing) return null;
  const tiers = pricingTiersFrom(decorations);
  const pack = num(sourcing.carton_pack);
  const length = num(sourcing.carton_length);
  const width = num(sourcing.carton_width);
  const height = num(sourcing.carton_height);
  const weight = num(sourcing.carton_weight);
  if (!tiers.length || !pack || length == null || width == null || height == null || weight == null) {
    return null;
  }
  const units = effectiveUnits(sourcing, supplier?.unit_system ?? null);
  return {
    id: sources.productId,
    origin: originCode,
    pcsPerCtn: pack,
    ctnLengthRaw: length,
    ctnWidthRaw: width,
    ctnHeightRaw: height,
    wtPerCtnRaw: weight,
    dimensionUnit: units.dimension,
    weightUnit: units.weight,
    dutyRate: sources.dutyRate,
    pricingTiers: tiers,
  };
}
