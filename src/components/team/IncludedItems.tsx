/**
 * Included items — the simple staff-only "what's in the box" list on a
 * Pricelist row ("2 × AAA batteries"). Not kit components: no pricing, no
 * component products. Never rendered on a customer-facing page.
 */
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InlineField } from "@/components/team/inline-field";
import {
  addProductInclude,
  deleteProductInclude,
  moveProductInclude,
  updateProductInclude,
  type ProductInclude,
} from "@/lib/product-includes";

export function IncludedItems({
  productId,
  rows,
  onChanged,
}: {
  productId: string;
  rows: ProductInclude[];
  onChanged: () => Promise<unknown>;
}) {
  const [adding, setAdding] = useState(false);
  const [qty, setQty] = useState("1");
  const [description, setDescription] = useState("");
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const nextSort = sorted.reduce((max, row) => Math.max(max, row.sort_order), 0) + 10;

  async function guard(action: () => Promise<unknown>) {
    try {
      await action();
      await onChanged();
    } catch (problem) {
      toast.error(problem instanceof Error ? problem.message : "Could not save");
    }
  }

  return (
    <div className="mt-1 flex flex-col gap-1">
      {sorted.length ? (
        <p className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground">Includes</p>
      ) : null}

      {sorted.map((row, index) => (
        <div key={row.id} className="group flex items-center gap-1">
          <span className="w-10 shrink-0">
            <InlineField
              value={String(row.quantity)}
              numeric
              validate={(raw) => (Number(raw) >= 1 ? null : "Quantity must be at least 1.")}
              save={(raw) =>
                guard(() => updateProductInclude(row.id, { quantity: Number(raw) })).then(
                  () => undefined,
                )
              }
            />
          </span>
          <span className="shrink-0 text-[13px] text-muted-foreground">×</span>
          <span className="min-w-0 flex-1">
            <InlineField
              value={row.description}
              save={(raw) =>
                guard(() => updateProductInclude(row.id, { description: raw })).then(
                  () => undefined,
                )
              }
            />
          </span>
          <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              aria-label="Move up"
              disabled={index === 0}
              className="text-muted-foreground hover:text-navy-700 disabled:opacity-30"
              onClick={() => void guard(() => moveProductInclude(sorted, row.id, -1))}
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={index === sorted.length - 1}
              className="text-muted-foreground hover:text-navy-700 disabled:opacity-30"
              onClick={() => void guard(() => moveProductInclude(sorted, row.id, 1))}
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Remove ${row.description}`}
              className="ml-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
              onClick={() => void guard(() => deleteProductInclude(row.id))}
            >
              ✕
            </button>
          </span>
        </div>
      ))}

      {adding ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            void guard(async () => {
              await addProductInclude({
                productId,
                quantity: Number(qty),
                description,
                sortOrder: nextSort,
              });
              setQty("1");
              setDescription("");
              setAdding(false);
            });
          }}
        >
          <input
            aria-label="Quantity"
            value={qty}
            inputMode="numeric"
            onChange={(event) => setQty(event.target.value)}
            className="h-7 w-10 shrink-0 rounded border border-navy-200 bg-card px-1.5 text-[13px] outline-none focus:border-lime-500"
          />
          <span className="shrink-0 text-[13px] text-muted-foreground">×</span>
          <input
            autoFocus
            aria-label="Included item"
            placeholder="AAA batteries"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-7 min-w-0 flex-1 rounded border border-navy-200 bg-card px-1.5 text-[13px] outline-none focus:border-lime-500"
          />
          <button
            type="submit"
            className="shrink-0 text-[11px] font-semibold text-navy-600 hover:underline"
          >
            Add
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-navy-500 hover:underline"
        >
          <Plus className="size-3" /> Add included item
        </button>
      )}
    </div>
  );
}
