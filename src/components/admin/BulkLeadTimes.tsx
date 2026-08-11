import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { leadRange, type Category, type Product } from "@/lib/catalog";

type Buffers = { airMin: string; airMax: string; seaMin: string; seaMax: string };

const DEFAULTS: Buffers = { airMin: "5", airMax: "8", seaMin: "30", seaMax: "40" };

function hasLeadTimes(product: Product) {
  return (
    product.air_lead_min != null ||
    product.air_lead_max != null ||
    product.sea_lead_min != null ||
    product.sea_lead_max != null
  );
}

export function BulkLeadTimes({
  open,
  onOpenChange,
  products,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  categories: Category[];
}) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState("all");
  const [buffers, setBuffers] = useState<Buffers>(DEFAULTS);
  const [overwrite, setOverwrite] = useState(false);
  const [applying, setApplying] = useState(false);
  const [report, setReport] = useState<{ updated: number; skipped: Product[] } | null>(null);

  const numbers = useMemo(
    () => ({
      airMin: Number(buffers.airMin),
      airMax: Number(buffers.airMax),
      seaMin: Number(buffers.seaMin),
      seaMax: Number(buffers.seaMax),
    }),
    [buffers],
  );

  const valid =
    Object.values(numbers).every((value) => Number.isFinite(value) && value >= 0) &&
    numbers.airMax >= numbers.airMin &&
    numbers.seaMax >= numbers.seaMin;

  const inScope = useMemo(
    () => products.filter((p) => scope === "all" || p.category_id === scope),
    [products, scope],
  );

  const noProduction = inScope.filter((p) => p.production_days == null);
  const alreadySet = inScope.filter((p) => p.production_days != null && hasLeadTimes(p));
  const targets = inScope.filter(
    (p) => p.production_days != null && (overwrite || !hasLeadTimes(p)),
  );

  const examples = targets.slice(0, 3).map((product) => {
    const days = product.production_days as number;
    return {
      name: product.name,
      days,
      air: leadRange(days + numbers.airMin, days + numbers.airMax),
      sea: leadRange(days + numbers.seaMin, days + numbers.seaMax),
    };
  });

  async function apply() {
    setApplying(true);
    try {
      let updated = 0;
      for (const product of targets) {
        const days = product.production_days as number;
        // Writes go through the staff member's own client so RLS stays the boundary.
        const { error } = await supabase
          .from("products")
          .update({
            air_lead_min: days + numbers.airMin,
            air_lead_max: days + numbers.airMax,
            sea_lead_min: days + numbers.seaMin,
            sea_lead_max: days + numbers.seaMax,
          })
          .eq("id", product.id);
        if (error) throw error;
        updated += 1;
      }
      setReport({ updated, skipped: [...noProduction, ...(overwrite ? [] : alreadySet)] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Lead times set on ${updated} products`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not set lead times");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Set lead times in bulk</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-10">
          <p className="text-sm text-muted-foreground">
            This works out each product's customer-facing lead time from its production time, then
            adds the shipping days you enter below.
          </p>

          <div>
            <Label>Which products?</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">Shipping days to add</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["airMin", "Air — fewest days"],
                  ["airMax", "Air — most days"],
                  ["seaMin", "Sea — fewest days"],
                  ["seaMax", "Sea — most days"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={`bulk-${key}`} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={`bulk-${key}`}
                    type="number"
                    min={0}
                    value={buffers[key]}
                    onChange={(event) =>
                      setBuffers((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            {!valid ? (
              <p className="text-xs text-destructive">
                Please enter whole numbers, and make sure the "most days" figure is not smaller than
                the "fewest days" figure.
              </p>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={overwrite} onCheckedChange={(value) => setOverwrite(value === true)} />
            Overwrite existing lead times
          </label>

          <div className="rounded-xl bg-secondary p-4 text-sm">
            <p className="font-semibold">What will happen</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>{targets.length} products will get new lead times.</li>
              <li>{noProduction.length} have no production time and will be left alone.</li>
              {!overwrite ? (
                <li>{alreadySet.length} already have lead times and will be left alone.</li>
              ) : null}
            </ul>
            {examples.length ? (
              <div className="mt-3 space-y-1.5">
                <p className="font-semibold">Examples</p>
                {examples.map((example) => (
                  <p key={example.name} className="text-xs text-muted-foreground">
                    {example.name} — {example.days} days production → air {example.air}, sea{" "}
                    {example.sea}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <Button disabled={!valid || applying || targets.length === 0} onClick={() => void apply()}>
            {applying ? "Working…" : `Apply to ${targets.length} products`}
          </Button>

          {report ? (
            <div className="rounded-xl border border-border p-4 text-sm">
              <p className="font-semibold">Done</p>
              <p className="mt-1 text-muted-foreground">
                {report.updated} products updated · {report.skipped.length} skipped
              </p>
              {report.skipped.length ? (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {report.skipped.map((product) => (
                    <li key={product.id}>
                      {product.sku ? `${product.sku} — ` : ""}
                      {product.name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}