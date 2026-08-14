/**
 * Unit vocabulary + conversions for the costing/packing surfaces.
 *
 * Every conversion goes through the physical constants stored in app_settings
 * (section "Conversions") so a stored number is never reinterpreted: values are
 * read in their EFFECTIVE unit (the explicit column when set, otherwise the
 * supplier's unit system) and normalized from there.
 */
import type { AppSetting } from "@/lib/costing";

export const WEIGHT_UNITS = ["KG", "LBS"] as const;
export const VOLUME_UNITS = ["CBM", "CUFT"] as const;
export const CHARGEABLE_UNITS = ["KG", "LBS", "CBM", "CUFT"] as const;
export type ChargeableUnit = (typeof CHARGEABLE_UNITS)[number];

/** Which units a shipping method may charge on, given its chargeable metric. */
export function unitsForMetric(metric: string): readonly ChargeableUnit[] {
  return metric === "VOLUME" ? VOLUME_UNITS : WEIGHT_UNITS;
}

/** Snap an existing unit to a valid one for the metric (weight → LBS, volume → CBM). */
export function snapUnit(metric: string, current: string): ChargeableUnit {
  const allowed = unitsForMetric(metric);
  const upper = current.trim().toUpperCase() as ChargeableUnit;
  if (allowed.includes(upper)) return upper;
  return metric === "VOLUME" ? "CBM" : "LBS";
}

export type DimensionUnit = "cm" | "in";
export type WeightUnit = "kg" | "lb";

/** Physical constants are settings, but never editable — they are facts. */
export const CONSTANT_KEYS = new Set([
  "conversions_kg_to_lbs",
  "conversions_in_to_cm",
  "conversions_cbm_divisor",
  "conversions_volumetric_divisor",
  "conversions_cbm_to_cuft",
]);

export type Constants = {
  kgToLbs: number;
  inToCm: number;
  cbmDivisor: number;
  cbmToCuft: number;
  /** kg charged per CBM — the volumetric factor used for chargeable weight. */
  volumetricDivisor: number;
};

const FALLBACK: Constants = {
  kgToLbs: 2.20462,
  inToCm: 2.54,
  cbmDivisor: 1_000_000,
  cbmToCuft: 35.3147,
  volumetricDivisor: 200,
};

export function constantsFrom(rows: AppSetting[] | undefined): Constants {
  const map = new Map((rows ?? []).map((row) => [row.key, Number(row.value)] as const));
  const pick = (key: string, fallback: number) => {
    const value = map.get(key);
    return value != null && Number.isFinite(value) && value !== 0 ? value : fallback;
  };
  return {
    kgToLbs: pick("conversions_kg_to_lbs", FALLBACK.kgToLbs),
    inToCm: pick("conversions_in_to_cm", FALLBACK.inToCm),
    cbmDivisor: pick("conversions_cbm_divisor", FALLBACK.cbmDivisor),
    cbmToCuft: pick("conversions_cbm_to_cuft", FALLBACK.cbmToCuft),
    volumetricDivisor: pick("conversions_volumetric_divisor", FALLBACK.volumetricDivisor),
  };
}

/** NULL columns inherit the supplier's system; no supplier falls back to metric. */
export function effectiveUnits(
  sourcing: { dimension_unit?: string | null; weight_unit?: string | null } | null,
  supplierUnitSystem: string | null | undefined,
) {
  const metric = (supplierUnitSystem ?? "metric") === "metric";
  const dimension = (sourcing?.dimension_unit ?? null) as DimensionUnit | null;
  const weight = (sourcing?.weight_unit ?? null) as WeightUnit | null;
  return {
    dimension: dimension ?? (metric ? "cm" : "in"),
    weight: weight ?? (metric ? "kg" : "lb"),
    dimensionAuto: dimension == null,
    weightAuto: weight == null,
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function convertLength(
  value: number,
  from: DimensionUnit,
  to: DimensionUnit,
  constants: Constants,
) {
  if (from === to) return value;
  return round(from === "in" ? value * constants.inToCm : value / constants.inToCm);
}

export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
  constants: Constants,
) {
  if (from === to) return value;
  return round(from === "kg" ? value * constants.kgToLbs : value / constants.kgToLbs);
}

/** Carton volume in CBM, normalized from the effective dimension unit. */
export function cartonCbm(
  l: number | null,
  w: number | null,
  h: number | null,
  unit: DimensionUnit,
  constants: Constants,
) {
  if (l == null || w == null || h == null) return null;
  const cm = [l, w, h].map((value) => convertLength(value, unit, "cm", constants));
  const cbm = (cm[0]! * cm[1]! * cm[2]!) / constants.cbmDivisor;
  return Math.round(cbm * 10000) / 10000;
}

/**
 * DISPLAY ONLY — chargeable weight in kg: max(actual, volume × volumetric factor).
 * Returns null when either input is missing, so the caller omits partial math.
 */
export function chargeableWeightKg(
  actual: number | null,
  actualUnit: WeightUnit,
  cbm: number | null,
  constants: Constants,
) {
  if (actual == null || cbm == null) return null;
  const kg = convertWeight(actual, actualUnit, "kg", constants);
  const volumetric = cbm * constants.volumetricDivisor;
  return Math.round(Math.max(kg, volumetric) * 10) / 10;
}
