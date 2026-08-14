import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { CalculationsCard } from "@/components/admin/calculations/CalculationsCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalcPageData } from "@/lib/calc-page";
import { productDecorationsQuery } from "@/lib/decorations";

const ALL = "__all__";

export function CalculationsPage() {
  const { rows, routes, settings, suppliers, loading, error } = useCalcPageData();
  // Kept for cache warmth parity with the Pricelist; the hook reads the same query.
  useQuery(productDecorationsQuery);
  const [supplierId, setSupplierId] = useState<string>(ALL);
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((entry) => {
      if (supplierId !== ALL && entry.supplier?.id !== supplierId) return false;
      if (!needle) return true;
      return `${entry.product.name} ${entry.product.sku ?? ""} ${
        entry.sourcing?.supplier_item_no ?? ""
      }`
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, supplierId, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Calculations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cost engine workings — Identity → Specs → Product Costs → FOB → Transport → CIF → LAC →
          LDF → Duty → LDP. Read-only: every number comes from costing data.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All suppliers</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.code} — {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, SKU or supplier item #"
          className="h-9 w-72"
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {visible.length} product{visible.length === 1 ? "" : "s"}
        </span>
      </div>

      {error ? <p className="text-sm text-destructive">Failed to load: {error}</p> : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((entry) => (
            <div key={entry.product.id} className="w-full overflow-x-auto">
              <CalculationsCard entry={entry} routes={routes} settings={settings} />
            </div>
          ))}
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No products match.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}