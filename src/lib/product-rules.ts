/**
 * Shared product validation rules. The expanded editor (ProductForm), the
 * staff quick-edit sheet and the Admin › Products inline cell editors all call
 * these — the messages must never be duplicated anywhere else.
 */

/** Blank/invalid text becomes null so "on request" and fixed times both work. */
export function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export type ProductionRuleInput = {
  production_min_days: string;
  production_max_days: string;
  rush_enabled: boolean;
  rush_production_min_days: string;
  rush_production_max_days: string;
  /** NULL / "none" means no shipping method is offered at all. */
  shipping_methods: string | null;
};

/** Production + rush rules. Returns a friendly problem message, or null. */
export function productionProblem(input: ProductionRuleInput): string | null {
  const normalMin = numberOrNull(input.production_min_days);
  const normalMax = numberOrNull(input.production_max_days);
  if (normalMax != null) {
    if (normalMin == null) return "Enter a minimum production time before adding a maximum.";
    if (normalMax < normalMin)
      return "The maximum production time must be the same as or longer than the minimum.";
  }
  if (input.rush_enabled) {
    const air =
      input.shipping_methods != null &&
      input.shipping_methods !== "sea_only" &&
      input.shipping_methods !== "none";
    if (!air) return "Rush requires air shipping.";
    const rushMin = numberOrNull(input.rush_production_min_days);
    const rushMax = numberOrNull(input.rush_production_max_days);
    if (rushMin == null || rushMin < 1) return "Please enter the rush production time in days.";
    if (rushMax != null && rushMax < rushMin)
      return "The maximum rush production time must be the same as or longer than the minimum.";
    if (normalMin == null) return "Add a normal production time before offering rush.";
    if (rushMin >= normalMin)
      return "Rush production time must be shorter than the normal production time.";
  }
  return null;
}

/** MOQ rule: blank clears it, otherwise a whole number of 1 or more. */
export function moqProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1)
    return "MOQ must be a whole number of 1 or more.";
  return null;
}

/** Product name rule, shared with the editors. */
export function nameProblem(value: string): string | null {
  return value.trim() ? null : "Please give the product a name.";
}
