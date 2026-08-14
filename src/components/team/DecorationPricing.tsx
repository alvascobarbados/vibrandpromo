/**
 * Pricing column of a Pricelist row: a horizontally scrolling strip of price
 * tables, one per decoration (method + detail), each with its quantity tiers.
 * Costs are staff-only — these tables have no anonymous access at all.
 */
import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MethodDetailPicker } from "@/components/team/MethodDetailPicker";
import { InlineField } from "@/components/team/inline-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addDecorationBand,
  addProductDecoration,
  deleteDecorationBand,
  deleteProductDecoration,
  hasGround,
  setDecorationGround,
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
  const [pendingDelete, setPendingDelete] = useState<ProductDecoration | null>(null);
  const [focusBandId, setFocusBandId] = useState<string | null>(null);
  const methodById = new Map(methods.map((method) => [method.id, method] as const));
  const detailById = new Map(details.map((detail) => [detail.id, detail] as const));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["product_decorations"] });

  async function guard(action: () => Promise<unknown>) {
    try {
      await action();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  const used = new Set(decorations.map((row) => row.method_detail_id));
  const isLast = decorations.length === 1;

  return (
    <>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {decorations.map((decoration) => {
          const detail = detailById.get(decoration.method_detail_id);
          const method = detail ? methodById.get(detail.decoration_method_id) : undefined;
          const bands = decoration.product_decoration_bands;
          const ground = hasGround(bands);
          const cols = ground
            ? "grid-cols-[52px_66px_66px_66px_18px]"
            : "grid-cols-[52px_66px_66px_18px]";
          const title =
            method?.code === "NODECO"
              ? "No decoration"
              : `${method?.name ?? "Decoration"} — ${detail?.detail ?? "Detail"}`;

          return (
            <div
              key={decoration.id}
              className="w-fit shrink-0 rounded-lg border border-navy-100 bg-navy-50/40 p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="max-w-[190px] text-xs font-semibold leading-tight text-navy-700">
                  {title}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Price table actions"
                    className="text-muted-foreground hover:text-navy-700"
                  >
                    <MoreVertical className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[60]">
                    <DropdownMenuItem onSelect={() => setPendingDelete(decoration)}>
                      <Trash2 className="mr-2 size-3.5" /> Delete price table
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div
                className={`mt-1.5 grid ${cols} items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`}
              >
                <span>Qty</span>
                <span>Unit $</span>
                <span>Setup $</span>
                {ground ? <span>Ground $</span> : null}
                <span />
              </div>

              {bands.map((band) => (
                <div key={band.id} className={`grid ${cols} items-center gap-1.5`}>
                  <InlineField
                    value={String(band.qty)}
                    numeric
                    autoEdit={band.id === focusBandId}
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
                  {ground ? (
                    <InlineField
                      value={numberText(band.inland_freight_usd)}
                      display={moneyLabel(band.inland_freight_usd)}
                      numeric
                      save={async (raw) => {
                        await updateDecorationBand(band.id, {
                          inland_freight_usd: numOrNull(raw) ?? 0,
                        });
                        await refresh();
                      }}
                    />
                  ) : null}
                  <button
                    type="button"
                    aria-label="Remove quantity tier"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void guard(() => deleteDecorationBand(band.id))}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}

              <div className="mt-1 flex flex-col items-start gap-0.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-500 hover:underline"
                  onClick={() => {
                    void guard(async () => {
                      const id = await addDecorationBand(
                        decoration.id,
                        (bands[bands.length - 1]?.qty ?? 0) + 1,
                        ground ? 0 : null,
                      );
                      setFocusBandId(id);
                    });
                  }}
                >
                  <Plus className="size-3" /> Add tier
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-navy-500 hover:underline"
                  onClick={() => void guard(() => setDecorationGround(bands, !ground))}
                >
                  {ground ? "– Remove ground freight" : "+ Add ground freight"}
                </button>
              </div>
            </div>
          );
        })}

        <MethodDetailPicker
          methods={methods}
          details={details}
          used={used}
          onPick={(detailId) =>
            void guard(() =>
              addProductDecoration({
                product_id: productId,
                method_detail_id: detailId,
                sort_order: decorations.length,
              }),
            )
          }
        />
      </div>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this price table?</AlertDialogTitle>
            <AlertDialogDescription>
              {isLast
                ? "This is the last price table — removing it clears this product's public decoration methods."
                : "This removes the decoration and all of its quantity tiers."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingDelete;
                setPendingDelete(null);
                if (target) void guard(() => deleteProductDecoration(target.id));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
