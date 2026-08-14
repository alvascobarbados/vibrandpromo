/**
 * Packing unit switch for the /team Pricelist.
 *
 * A unit change never silently reinterprets stored numbers: picking a different
 * unit asks whether the values were entered in the new unit ("keep") or should
 * be converted through the Settings constants ("convert"), showing a live
 * preview of the converted numbers first. Cancel writes nothing.
 */
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Constants } from "@/lib/units";

export type UnitField = { key: string; label: string; value: number | null };

export function UnitSwitch({
  options,
  value,
  auto,
  ariaLabel,
  fields,
  unitColumn,
  convert,
  onApply,
}: {
  options: readonly string[];
  value: string;
  auto: boolean;
  ariaLabel: string;
  /** Fields written in the current unit, converted when the user picks convert. */
  fields: UnitField[];
  /** Column that stores the explicit unit (dimension_unit / weight_unit). */
  unitColumn: string;
  convert: (value: number, from: string, to: string) => number;
  onApply: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filled = fields.filter((field) => field.value != null);
  const preview = target
    ? filled.map((field) => ({
        ...field,
        next: convert(field.value as number, value, target),
      }))
    : [];
  const example = preview[0];

  const run = async (patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      await onApply(patch);
      setTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span className="inline-flex items-center gap-1">
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (next === value) return;
            if (filled.length === 0) {
              void run({ [unitColumn]: next });
              return;
            }
            setTarget(next);
          }}
          className="h-5 rounded border border-navy-200 bg-card px-0.5 text-[11px] uppercase outline-none focus:border-lime-500"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {auto ? (
          <span
            title="Inherited from the supplier's unit system"
            className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            auto
          </span>
        ) : null}
      </span>

      <AlertDialog open={target != null} onOpenChange={(open) => (open ? null : setTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch to {target?.toUpperCase()} — what do the stored numbers mean?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose whether the values were already entered in {target}, or should be converted
              using the Settings constants.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-navy-100 bg-navy-50/60 p-3 text-[12px]">
            <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">
              Converted preview
            </p>
            <ul className="space-y-0.5">
              {preview.map((field) => (
                <li key={field.key} className="flex justify-between gap-4 tabular-nums">
                  <span className="text-muted-foreground">{field.label}</span>
                  <span>
                    {field.value} {value} → {field.next} {target}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              disabled={busy}
              variant="outline"
              className="w-full"
              onClick={() => void run({ [unitColumn]: target })}
            >
              Keep the numbers — they were entered in {target}
            </Button>
            <Button
              disabled={busy}
              className="w-full"
              onClick={() => {
                const patch: Record<string, unknown> = { [unitColumn]: target };
                for (const field of preview) patch[field.key] = field.next;
                void run(patch);
              }}
            >
              Convert the values
              {example ? ` — ${example.value} ${value} → ${example.next} ${target}` : ""}
            </Button>
            <AlertDialogCancel className="mt-0 w-full">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
