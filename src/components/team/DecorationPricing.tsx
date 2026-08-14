/**
 * Pricing column of a Pricelist row: one block per decoration (method +
 * detail) with its quantity bands. Costs are staff-only — these tables have no
 * anonymous access at all.
 */
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InlineField } from "@/components/team/inline-field";
import {
  addDecorationBand,
  addProductDecoration,
  deleteDecorationBand,
  deleteProductDecoration,
  updateDecorationBand,
  type DecorationMethod,
  type MethodDetail,
  type ProductDecoration,
} from "@/lib/decorations";
import { moneyLabel, numOrNull, numberText, positiveProblem } from "@/lib/pricelist";

type Props = {
  productId: string;
  decorations: ProductDecoration[];
  methods: DecorationMethod[];
  details: MethodDetail[];
};

export function DecorationPricing({ productId, decorations, methods, details }: Props) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const methodById = new Map(methods.map((method) => [method.id, method] as const));
  const detailById = new Map(details.map((detail) => [detail.id, detail] as const));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["product_decorations"] });

  async function guard(action: () => Promise<void>) {
    try {
      await action();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  const used = new Set(decorations.map((row) => row.method_detail_id));

  return (
    <div className="flex flex-col gap-2">
      {decorations.length === 0 ? (
        <p className="text-xs text-muted-foreground">No decoration pricing yet.</p>
      ) : null}

      {decorations.map((decoration) => {
        const detail = detailById.get(decoration.method_detail_id);
        const method = detail ? methodById.get(detail.decoration_method_id) : undefined;
        const bands = decoration.product_decoration_bands;
        return (
          <div key={decoration.id} className="rounded-lg border border-navy-100 bg-navy-50/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold text-navy-700">
                {method?.name ?? "Decoration"} — {detail?.detail ?? "Detail"}
              </p>
              <button
                type="button"
                aria-label="Remove decoration"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => void guard(() => deleteProductDecoration(decoration.id))}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <div className="mt-1.5 grid grid-cols-[64px_1fr_1fr_1fr_20px] items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Qty</span>
              <span>Unit</span>
              <span>Setup</span>
              <span>Ground</span>
              <span />
            </div>
            {bands.map((band) => (
              <div
                key={band.id}
                className="grid grid-cols-[64px_1fr_1fr_1fr_20px] items-center gap-1.5"
              >
                <InlineField
                  value={String(band.qty)}
                  numeric
                  validate={(raw) => (numOrNull(raw) ? null : "Enter a quantity.")}
                  save={async (raw) => {
                    await updateDecorationBand(band.id, { qty: Number(numOrNull(raw)) });
                    await refresh();
                  }}
                />
                <InlineField
                  value={numberText(band.unit_cost)}
                  display={moneyLabel(band.unit_cost)}
                  numeric
                  validate={positiveProblem}
                  save={async (raw) => {
                    await updateDecorationBand(band.id, { unit_cost: numOrNull(raw) ?? 0 });
                    await refresh();
                  }}
                />
                <InlineField
                  value={numberText(band.setup_cost)}
                  display={moneyLabel(band.setup_cost)}
                  numeric
                  save={async (raw) => {
                    await updateDecorationBand(band.id, { setup_cost: numOrNull(raw) ?? 0 });
                    await refresh();
                  }}
                />
                <InlineField
                  value={numberText(band.inland_freight_usd)}
                  display={moneyLabel(band.inland_freight_usd)}
                  numeric
                  save={async (raw) => {
                    await updateDecorationBand(band.id, { inland_freight_usd: numOrNull(raw) });
                    await refresh();
                  }}
                />
                <button
                  type="button"
                  aria-label="Remove quantity band"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void guard(() => deleteDecorationBand(band.id))}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-navy-500 hover:underline"
              onClick={() =>
                void guard(() =>
                  addDecorationBand(
                    decoration.id,
                    (bands[bands.length - 1]?.qty ?? 100) * 2,
                  ),
                )
              }
            >
              <Plus className="size-3" /> Quantity band
            </button>
          </div>
        );
      })}

      {adding ? (
        <select
          autoFocus
          defaultValue=""
          className="h-7 w-full rounded border border-navy-200 bg-card px-1.5 text-[13px]"
          onBlur={() => setAdding(false)}
          onChange={(event) => {
            const detailId = event.target.value;
            setAdding(false);
            if (!detailId) return;
            void guard(() =>
              addProductDecoration({
                product_id: productId,
                method_detail_id: detailId,
                sort_order: decorations.length,
              }).then(() => undefined),
            );
          }}
        >
          <option value="">Choose a decoration…</option>
          {methods.map((method) => (
            <optgroup key={method.id} label={method.name}>
              {details
                .filter((detail) => detail.decoration_method_id === method.id && !used.has(detail.id))
                .map((detail) => (
                  <option key={detail.id} value={detail.id}>
                    {detail.detail}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      ) : (
        <button
          type="button"
          className="inline-flex w-fit items-center gap-1 rounded-full border border-navy-200 px-2 py-1 text-[11px] font-semibold text-navy-700 hover:bg-navy-50"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3" /> Add decoration
        </button>
      )}
    </div>
  );
}