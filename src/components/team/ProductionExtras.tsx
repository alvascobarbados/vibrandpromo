/**
 * RUSH + SHIPS BY controls for the /team Pricelist Production block.
 *
 * These edit LIVE customer-facing fields (products.rush_enabled,
 * rush_production_min/max_days, shipping_methods) through the SAME staff-gated
 * products update path the quick-edit sheet uses, and every rule comes from the
 * ONE shared validator in src/lib/product-rules.ts — no copies, no re-worded
 * messages. Rush is only STORED once the shared validator accepts it, so a
 * half-entered rush never reaches the customer card.
 */
import { useQuery } from "@tanstack/react-query";
import { Plane, Ship } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InlineField } from "@/components/team/inline-field";
import type { Product } from "@/lib/catalog";
import { transportModesQuery, type TransportMode } from "@/lib/costing";
import { numOrNull } from "@/lib/pricelist";
import { productionProblem } from "@/lib/product-rules";

/** The shared validator's own "rush days still blank" message. */
const NEEDS_RUSH_DAYS = "Please enter the rush production time in days.";

const text = (value: number | null | undefined) => (value == null ? "" : String(value));

/** Icon + label per transport mode; the chips are generated from the data. */
const MODE_UI: Record<TransportMode, { Icon: typeof Plane; label: string }> = {
  air: { Icon: Plane, label: "Air shipping" },
  sea: { Icon: Ship, label: "Sea shipping" },
};

export function ProductionExtras({
  product,
  save,
}: {
  product: Product;
  save: (patch: Record<string, unknown>) => Promise<void>;
}) {
  /** Rush shown but not yet stored (waiting for valid rush days). */
  const [rushDraft, setRushDraft] = useState(false);
  const [shake, setShake] = useState(false);
  /**
   * SHIPS BY chips come from the transport modes present in the costing
   * shipping_methods table. ENGINE CONTRACT — a costing route is eligible only
   * when route.method.transport_mode is enabled in this capability field, and
   * rush lead time = rush production + fastest 'air' mode route.
   */
  const modes = useQuery(transportModesQuery);
  const availableModes: TransportMode[] =
    modes.data && modes.data.length ? modes.data : ["air", "sea"];
  const rushOn = product.rush_enabled || rushDraft;
  const methods = product.shipping_methods ?? "air_sea";
  const air = methods !== "sea_only";
  const sea = methods !== "air_only";

  const check = (patch: { min?: string; max?: string; rush?: boolean; shipping?: string }) =>
    productionProblem({
      production_min_days: text(product.production_min_days),
      production_max_days: text(product.production_max_days),
      rush_enabled: patch.rush ?? rushOn,
      rush_production_min_days: patch.min ?? text(product.rush_production_min_days),
      rush_production_max_days: patch.max ?? text(product.rush_production_max_days),
      shipping_methods: patch.shipping ?? methods,
    });

  const guard = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (problem) {
      toast.error(problem instanceof Error ? problem.message : "Could not save");
    }
  };

  async function toggleRush() {
    if (product.rush_enabled) {
      await guard(() =>
        save({
          rush_enabled: false,
          rush_production_min_days: null,
          rush_production_max_days: null,
        }),
      );
      setRushDraft(false);
      return;
    }
    if (rushDraft) {
      setRushDraft(false);
      return;
    }
    const problem = check({ rush: true });
    if (problem && problem !== NEEDS_RUSH_DAYS) {
      toast.error(problem);
      return;
    }
    if (!problem) {
      await guard(() => save({ rush_enabled: true }));
      return;
    }
    setRushDraft(true);
  }

  const saveRushDay = (which: "min" | "max") => async (raw: string) => {
    const problem = check(which === "min" ? { rush: true, min: raw } : { rush: true, max: raw });
    if (problem) throw new Error(problem);
    await save({
      rush_enabled: true,
      rush_production_min_days:
        which === "min" ? numOrNull(raw) : product.rush_production_min_days,
      rush_production_max_days:
        which === "max" ? numOrNull(raw) : product.rush_production_max_days,
    });
    setRushDraft(false);
  };

  async function toggleMethod(which: "air" | "sea") {
    const nextAir = which === "air" ? !air : air;
    const nextSea = which === "sea" ? !sea : sea;
    if (!nextAir && !nextSea) {
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      return;
    }
    const next = nextAir && nextSea ? "air_sea" : nextAir ? "air_only" : "sea_only";
    if (!nextAir && rushOn) {
      if (!window.confirm("Rush needs air — this turns rush off")) return;
      await guard(() =>
        save({
          shipping_methods: next,
          rush_enabled: false,
          rush_production_min_days: null,
          rush_production_max_days: null,
        }),
      );
      setRushDraft(false);
      return;
    }
    await guard(() => save({ shipping_methods: next }));
  }

  const chip = (on: boolean) =>
    `inline-flex size-6 items-center justify-center rounded-md transition-colors ${
      on ? "bg-lime-500 text-n-700" : "bg-navy-100 text-muted-foreground hover:bg-navy-200"
    }`;
  const soleShake = shake ? "animate-shake" : "";

  return (
    <>
      <div className="grid min-h-6 grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3">
        <span className="truncate whitespace-nowrap text-[11px] uppercase leading-6 tracking-[0.04em] text-muted-foreground">
          Rush
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleRush()}
            aria-pressed={rushOn}
            className={`inline-flex h-[18px] items-center rounded-full px-2 text-[11px] font-semibold leading-none ${
              rushOn ? "bg-lime-500 text-n-700" : "bg-navy-100 text-muted-foreground"
            }`}
          >
            RUSH
          </button>
          {rushOn && !product.rush_enabled ? (
            <span className="text-[10px] text-muted-foreground">enter days</span>
          ) : null}
        </span>
      </div>

      {rushOn ? (
        <div className="grid min-h-6 grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3">
          <span className="truncate whitespace-nowrap text-[11px] uppercase leading-6 tracking-[0.04em] text-muted-foreground">
            Rush prod
          </span>
          <span className="flex min-w-0 flex-nowrap items-center gap-0.5">
            <InlineField
              className="w-10 shrink-0"
              value={text(product.rush_production_min_days)}
              numeric
              save={saveRushDay("min")}
            />
            <span className="shrink-0 text-[13px] text-muted-foreground">–</span>
            <InlineField
              className="w-10 shrink-0"
              value={text(product.rush_production_max_days)}
              numeric
              save={saveRushDay("max")}
            />
            <span className="ml-1 whitespace-nowrap text-[11px] text-muted-foreground">days</span>
          </span>
        </div>
      ) : null}

      <div className="grid min-h-6 grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3">
        <span className="truncate whitespace-nowrap text-[11px] uppercase leading-6 tracking-[0.04em] text-muted-foreground">
          Ships by
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {availableModes.map((mode) => {
            const { Icon, label } = MODE_UI[mode];
            const on = mode === "air" ? air : sea;
            const sole = on && (mode === "air" ? !sea : !air);
            return (
              <button
                key={mode}
                type="button"
                aria-label={label}
                aria-pressed={on}
                {...(sole ? { title: "At least one shipping method" } : {})}
                onClick={() => void toggleMethod(mode)}
                className={`${chip(on)} ${sole ? soleShake : ""}`}
              >
                <Icon className="size-3.5" />
              </button>
            );
          })}
        </span>
      </div>
    </>
  );
}