/**
 * "+ Add attribute" typeahead for the /team Pricelist. Picks (or creates) a
 * shared label from detail_labels, then stores the per-product value in
 * product_details. Unique per product + label, so duplicates are rejected.
 */
import { Check, ChevronLeft, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  addProductDetail,
  ensureDetailLabel,
  type DetailLabel,
} from "@/lib/product-details";

type Stage = { kind: "pick" } | { kind: "value"; label: DetailLabel };

export function AddAttributePopover({
  productId,
  labels,
  usedLabelIds,
  nextSortOrder,
  onAdded,
}: {
  productId: string;
  labels: DetailLabel[];
  usedLabelIds: Set<string>;
  nextSortOrder: number;
  onAdded: () => void | Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) return;
    setSearch("");
    setDraft("");
    setStage({ kind: "pick" });
  }, [open]);

  const available = labels.filter((row) => !usedLabelIds.has(row.id));
  const typed = search.trim();
  const exact = available.some((row) => row.label.trim().toLowerCase() === typed.toLowerCase());
  const canCreate = typed.length > 0 && !exact;

  const createLabel = async () => {
    setBusy(true);
    try {
      const label = await ensureDetailLabel(typed);
      if (usedLabelIds.has(label.id)) {
        toast.error("That attribute is already on this product.");
        return;
      }
      setStage({ kind: "value", label });
    } catch (problem) {
      toast.error(problem instanceof Error ? problem.message : "Could not create label");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (stage.kind !== "value") return;
    setBusy(true);
    try {
      await addProductDetail({
        productId,
        detailLabelId: stage.label.id,
        value: draft,
        sortOrder: nextSortOrder,
      });
      await onAdded();
      setOpen(false);
    } catch (problem) {
      toast.error(problem instanceof Error ? problem.message : "Could not add attribute");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1 w-fit rounded-full border border-dashed border-navy-200 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-lime-500 hover:text-foreground"
        >
          + Add attribute
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0 z-[60]">
        {stage.kind === "pick" ? (
          <Command>
            <CommandInput
              placeholder="Search or create label…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {canCreate ? (
                  <button
                    type="button"
                    onClick={createLabel}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-[13px] text-foreground"
                  >
                    <Plus className="size-3.5" /> Create “{typed}”
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">No labels found.</span>
                )}
              </CommandEmpty>
              <CommandGroup>
                {available.map((row) => (
                  <CommandItem
                    key={row.id}
                    value={row.label}
                    onSelect={() => setStage({ kind: "value", label: row })}
                  >
                    {row.label}
                  </CommandItem>
                ))}
                {canCreate && available.length > 0 ? (
                  <CommandItem value={`__create__${typed}`} onSelect={createLabel}>
                    <Plus className="mr-2 size-3.5" /> Create “{typed}”
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            <button
              type="button"
              onClick={() => setStage({ kind: "pick" })}
              className="inline-flex w-fit items-center gap-1 text-[11px] text-muted-foreground"
            >
              <ChevronLeft className="size-3" /> Back
            </button>
            <div className="text-xs text-muted-foreground">{stage.label.label}</div>
            <input
              autoFocus
              placeholder="Value (e.g. 12oz Cotton)"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void save();
                }
              }}
              className="h-8 w-full rounded border border-navy-200 bg-card px-2 text-[13px] outline-none focus:border-lime-500"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="inline-flex items-center justify-center gap-1.5 rounded bg-navy-900 px-2.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Save
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
