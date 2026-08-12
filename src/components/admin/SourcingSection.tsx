import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  createSupplier,
  supplierCodeProblem,
  supplierLabel,
  suppliersQuery,
} from "@/lib/sourcing";

export type SourcingValue = { supplier_id: string; supplier_item_no: string };

/**
 * Staff-only sourcing editor shared by the quick-edit sheet and the full admin
 * product form. Never rendered in a customer-facing surface.
 */
export function SourcingSection({
  value,
  onChange,
  idPrefix,
}: {
  value: SourcingValue;
  onChange: (patch: Partial<SourcingValue>) => void;
  idPrefix: string;
}) {
  const queryClient = useQueryClient();
  const suppliers = useQuery(suppliersQuery);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  const list = useMemo(
    () => (suppliers.data ?? []).filter((s) => !s.is_archived || s.id === value.supplier_id),
    [suppliers.data, value.supplier_id],
  );
  const selected = list.find((s) => s.id === value.supplier_id) ?? null;

  async function quickCreate() {
    const problem = supplierCodeProblem(newCode);
    if (!newName.trim()) {
      toast.error("Enter the supplier name.");
      return;
    }
    if (problem) {
      toast.error(problem);
      return;
    }
    setCreating(true);
    try {
      const supplier = await createSupplier({ name: newName, code: newCode });
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onChange({ supplier_id: supplier.id });
      setAdding(false);
      setNewName("");
      setNewCode("");
      toast.success(`${supplierLabel(supplier)} added. Add the details on the Suppliers page.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the supplier.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-n-200 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Sourcing — internal only
      </p>

      <div>
        <Label>Supplier</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="mt-1.5 w-full justify-between font-normal"
            >
              <span className={selected ? "" : "text-muted-foreground"}>
                {selected ? supplierLabel(selected) : "No supplier assigned"}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search suppliers…" />
              <CommandList>
                <CommandEmpty>No supplier found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="none unassigned"
                    onSelect={() => {
                      onChange({ supplier_id: "" });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={`mr-2 size-4 ${selected ? "opacity-0" : "opacity-100"}`}
                    />
                    No supplier assigned
                  </CommandItem>
                  {list.map((supplier) => (
                    <CommandItem
                      key={supplier.id}
                      value={`${supplier.code} ${supplier.name}`}
                      onSelect={() => {
                        onChange({ supplier_id: supplier.id });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 size-4 ${
                          selected?.id === supplier.id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {supplierLabel(supplier)}
                      {supplier.is_archived ? (
                        <span className="ml-2 text-xs text-muted-foreground">archived</span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {adding ? (
          <div className="mt-2 space-y-2 rounded-lg bg-secondary p-2">
            <div className="flex gap-2">
              <Input
                value={newName}
                placeholder="Supplier name"
                onChange={(event) => setNewName(event.target.value)}
              />
              <Input
                value={newCode}
                placeholder="ABC"
                maxLength={3}
                className="w-20 uppercase"
                onChange={(event) => setNewCode(event.target.value.toUpperCase())}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={creating} onClick={() => void quickCreate()}>
                {creating ? "Adding…" : "Add supplier"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-navy-500 hover:text-navy-700 hover:underline"
          >
            <Plus className="size-3.5" /> Add supplier
          </button>
        )}
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-supplier-item-no`}>Supplier item no.</Label>
        <Input
          id={`${idPrefix}-supplier-item-no`}
          value={value.supplier_item_no}
          placeholder="Their code for this item"
          onChange={(event) => onChange({ supplier_item_no: event.target.value })}
        />
      </div>
    </div>
  );
}