/**
 * Add-decoration picker for the Pricelist pricing strip: a searchable popover
 * grouped by decoration method, mirroring the ERP's method/detail chooser.
 * Details already priced on this product are hidden.
 */
import { Plus } from "lucide-react";
import { useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DecorationMethod, MethodDetail } from "@/lib/decorations";

export function MethodDetailPicker({
  methods,
  details,
  used,
  onPick,
  compact,
}: {
  methods: DecorationMethod[];
  details: MethodDetail[];
  used: Set<string>;
  onPick: (detailId: string) => void;
  /** Rows that already have a price table get a small tile, not a billboard. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={
          compact
            ? "flex h-fit shrink-0 items-center gap-1 self-start rounded-lg border border-dashed border-navy-200 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-500 hover:border-lime-500 hover:bg-navy-50"
            : "flex h-full min-h-[120px] w-[150px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-navy-200 text-[11px] font-semibold uppercase tracking-wide text-navy-500 hover:border-lime-500 hover:bg-navy-50"
        }
        aria-label="Add decoration"
      >
        <Plus className={compact ? "size-3" : "size-4"} />
        {compact ? "Add" : "Add decoration"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search decorations…" className="text-[13px]" />
          <CommandList className="max-h-[260px]">
            <CommandEmpty>No decoration found.</CommandEmpty>
            {methods.map((method) => {
              const options = details.filter(
                (detail) => detail.decoration_method_id === method.id && !used.has(detail.id),
              );
              if (options.length === 0) return null;
              return (
                <CommandGroup key={method.id} heading={method.name}>
                  {options.map((detail) => (
                    <CommandItem
                      key={detail.id}
                      value={`${method.name} ${detail.detail} ${detail.code}`}
                      onSelect={() => {
                        setOpen(false);
                        onPick(detail.id);
                      }}
                      className="text-[13px]"
                    >
                      {detail.detail}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
