/**
 * RUSH + SHIPS BY controls for the /team Pricelist Production block.
 *
 * These edit LIVE customer-facing fields (products.rush_enabled,
 * rush_production_min/max_days, shipping_methods) through the SAME staff-gated
 * products update path the quick-edit sheet uses, and every rule comes from the
 * ONE shared validator in src/lib/product-rules.ts — no copies, no re-worded
 * messages.
 *
 * RUSH is a plain input pair: a blank minimum simply means rush is off, so
 * there is no separate toggle to get out of step with the numbers.
 * SHIPS BY is two word chips; BOTH may be off, which stores NULL (no shipping
 * method offered). Clearing AIR clears the rush values with it, because the
 * shared validator refuses rush without air.
 */
import { useState } from "react";
import { toast } from "sonner";

import { InlineField } from "@/components/team/inline-field";
import { RangeRow } from "@/components/team/range-row";
import type { Product } from "@/lib/catalog";
import { numOrNull } from "@/lib/pricelist";
import { productionProblem } from "@/lib/product-rules";

const text = (value: number | null | undefined) => (value == null ? "" : String(value));

/** ONE place that turns the two chip states into the stored value. */
function methodsValue(air: boolean, sea: boolean): string | null {
  if (air && sea) return "air_sea";
  if (air) return "air_only";
  if (sea) return "sea_only";
  return null;
}

export function ProductionExtras({
  product,
  save,
}: {
  product: Product;
  save: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const methods = product.shipping_methods;
  const air = methods === "air_sea" || methods === "air_only";
  const sea = methods === "air_sea" || methods === "sea_only";

  const guard = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (problem) {
      toast.error(problem instanceof Error ? problem.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  /** Rush days write straight through the shared validator. */
  const saveRushDay = (which: "min" | "max") => async (raw: string) => {
    const min = which === "min" ? raw : text(product.rush_production_min_days);
    const max = which === "max" ? raw : text(product.rush_production_max_days);
    const off = !min.trim();
    const problem = off
      ? null
      : productionProblem({
          production_min_days: text(product.production_min_days),
          production_max_days: text(product.production_max_days),
          rush_enabled: true,
          rush_production_min_days: min,
          rush_production_max_days: max,
          shipping_methods: methods,
        });
    if (problem) throw new Error(problem);
    await save({
      rush_enabled: !off,
      rush_production_min_days: off ? null : numOrNull(min),
      rush_production_max_days: off ? null : numOrNull(max),
    });
  };

  async function toggleMethod(which: "air" | "sea") {
    const nextAir = which === "air" ? !air : air;
    const nextSea = which === "sea" ? !sea : sea;
    const patch: Record<string, unknown> = { shipping_methods: methodsValue(nextAir, nextSea) };
    /** Rush needs air — dropping air clears the rush values in the same write. */
    if (!nextAir && product.rush_enabled) {
      if (!window.confirm("Rush needs air — this clears the rush production time")) return;
      patch['rush_enabled'] = false;
      patch['rush_production_min_days'] = null;
      patch['rush_production_max_days'] = null;
    }
    await guard(() => save(patch));
  }

  const chip = (on: boolean) =>
    `inline-flex h-[18px] items-center rounded-full px-2 text-[11px] font-semibold leading-none transition-colors ${
      on ? "bg-lime-500 text-n-700" : "border border-n-300 text-muted-foreground hover:bg-n-100"
    }`;

  return (
    <>
      <div className="grid min-h-[26px] grid-cols-[88px_minmax(0,1fr)] items-center gap-x-3">
        <span className="truncate whitespace-nowrap text-[11px] uppercase leading-5 tracking-[0.04em] text-muted-foreground">
          Rush
        </span>
        {/* Identical range rendering to LEAD TIME — one shared component. */}
        <RangeRow
          min={text(product.rush_production_min_days)}
          max={text(product.rush_production_max_days)}
          saveMin={saveRushDay("min")}
          saveMax={saveRushDay("max")}
          suffix={product.rush_enabled ? "days" : "· off"}
        />
      </div>

      <div className="grid min-h-[26px] grid-cols-[88px_minmax(0,1fr)] items-center gap-x-3">
        <span className="truncate whitespace-nowrap text-[11px] uppercase leading-5 tracking-[0.04em] text-muted-foreground">
          Ships by
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            disabled={busy}
            aria-pressed={air}
            onClick={() => void toggleMethod("air")}
            className={chip(air)}
          >
            AIR
          </button>
          <button
            type="button"
            disabled={busy}
            aria-pressed={sea}
            onClick={() => void toggleMethod("sea")}
            className={chip(sea)}
          >
            SEA
          </button>
        </span>
      </div>
    </>
  );
}
