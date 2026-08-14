/**
 * Pricing column of a Pricelist row: a horizontally scrolling strip of price
 * tables, one per decoration (method + detail), each with its quantity tiers.
 * Costs are staff-only — these tables have no anonymous access at all.
 */
import { useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, MoreVertical, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  updateProductDecoration,
  type DecorationMethod,
  type MethodDetail,
  type ProductDecoration,
} from "@/lib/decorations";
import {
  removeDecorationRef,
  signedRefUrl,
  uploadDecorationRef,
} from "@/lib/costing-refs";
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
          /** Tiers ALWAYS read as a qty-ascending ladder, whatever the write order. */
          const bands = [...decoration.product_decoration_bands].sort((a, b) => a.qty - b.qty);
          const ground = hasGround(bands);
          const cols = ground
            ? "grid-cols-[52px_66px_66px_66px_18px]"
            : "grid-cols-[52px_66px_66px_18px]";
          const methodName = method?.name ?? "Decoration";
          const detailText = detail?.detail ?? "Detail";
          /** Type-A rows repeat the method name as their detail — show it once. */
          const title =
            method?.code === "NODECO"
              ? "No decoration"
              : detailText.trim().toLowerCase() === methodName.trim().toLowerCase()
                ? methodName
                : `${methodName} — ${detailText}`;

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
                <div key={band.id} className={`group grid ${cols} items-center gap-1.5`}>
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
                    display={
                      band.setup_cost ? (
                        moneyLabel(band.setup_cost)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    }
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
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
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
                      const highest = bands.reduce((max, band) => Math.max(max, band.qty), 0);
                      const id = await addDecorationBand(
                        decoration.id,
                        highest + 1,
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

              {/* Staff-only notes + reference image — never customer-facing. */}
              <div className="mt-1.5 border-t border-navy-100 pt-1.5">
                <InlineField
                  value={decoration.notes ?? ""}
                  placeholder="Notes"
                  display={
                    <span className="text-[11px] text-muted-foreground">
                      {decoration.notes || "Add note"}
                    </span>
                  }
                  save={async (raw) => {
                    await updateProductDecoration(decoration.id, {
                      notes: raw.trim() || null,
                    });
                    await refresh();
                  }}
                />
                <RefImageSlot
                  decorationId={decoration.id}
                  path={decoration.ref_image_url}
                  onChanged={refresh}
                />
              </div>
            </div>
          );
        })}

        <MethodDetailPicker
          methods={methods}
          details={details}
          used={used}
          compact={decorations.length > 0}
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

/** Reference-image slot: upload / replace / remove, preview via signed URL. */
function RefImageSlot({
  decorationId,
  path,
  onChanged,
}: {
  decorationId: string;
  path: string | null;
  onChanged: () => Promise<unknown>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedRefUrl(path)
      .then((signed) => {
        if (live) setUrl(signed);
      })
      .catch(() => {
        if (live) setUrl(null);
      });
    return () => {
      live = false;
    };
  }, [path]);

  async function guard(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save reference image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void guard(async () => {
            const next = await uploadDecorationRef(decorationId, file);
            await updateProductDecoration(decorationId, { ref_image_url: next });
            if (path) await removeDecorationRef(path).catch(() => undefined);
          });
        }}
      />
      {path ? (
        <>
          <a
            href={url ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-label="Open reference image"
            className="size-8 overflow-hidden rounded border border-navy-200 bg-card"
          >
            {url ? (
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="m-1.5 size-5 text-muted-foreground" />
            )}
          </a>
          <button
            type="button"
            disabled={busy}
            className="text-[11px] font-semibold text-navy-500 hover:underline"
            onClick={() => input.current?.click()}
          >
            Replace
          </button>
          <button
            type="button"
            disabled={busy}
            className="text-[11px] font-semibold text-muted-foreground hover:text-destructive"
            onClick={() =>
              void guard(async () => {
                await updateProductDecoration(decorationId, { ref_image_url: null });
                await removeDecorationRef(path);
              })
            }
          >
            Remove
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-500 hover:underline"
          onClick={() => input.current?.click()}
        >
          <Upload className="size-3" /> Reference image
        </button>
      )}
    </div>
  );
}
