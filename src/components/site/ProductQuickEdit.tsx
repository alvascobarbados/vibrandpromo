import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SHIPPING_METHOD_OPTIONS, type Product } from "@/lib/catalog";
import { airLeadLabel, rushLeadLabel, seaLeadLabel, useShippingSettings } from "@/lib/shipping";
import { RushChip } from "@/components/site/RushChip";
import { SourcingSection } from "@/components/admin/SourcingSection";
import { productSourcingQuery, saveProductSourcing } from "@/lib/sourcing";
import { useQuery } from "@tanstack/react-query";

export function ProductQuickEdit({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(product.name);
  const [moq, setMoq] = useState(product.moq == null ? "" : String(product.moq));
  const [productionMin, setProductionMin] = useState(
    product.production_min_days == null ? "" : String(product.production_min_days),
  );
  const [productionMax, setProductionMax] = useState(
    product.production_max_days == null ? "" : String(product.production_max_days),
  );
  const [price, setPrice] = useState(product.price == null ? "" : String(product.price));
  const [showPrice, setShowPrice] = useState(product.show_price);
  const [shippingMethods, setShippingMethods] = useState(product.shipping_methods ?? "air_sea");
  const [rushEnabled, setRushEnabled] = useState(product.rush_enabled ?? false);
  const [rushMin, setRushMin] = useState(
    product.rush_production_min_days == null ? "" : String(product.rush_production_min_days),
  );
  const [rushMax, setRushMax] = useState(
    product.rush_production_max_days == null ? "" : String(product.rush_production_max_days),
  );
  const [isActive, setIsActive] = useState(product.is_active);
  const [isFeatured, setIsFeatured] = useState(product.is_featured);
  const [saving, setSaving] = useState(false);
  const sourcing = useQuery(productSourcingQuery);
  const sourcingRow = (sourcing.data ?? []).find((row) => row.product_id === product.id) ?? null;
  const [supplierId, setSupplierId] = useState("");
  const [supplierItemNo, setSupplierItemNo] = useState("");
  const [sourcingLoaded, setSourcingLoaded] = useState(false);
  if (!sourcingLoaded && sourcing.isSuccess) {
    setSourcingLoaded(true);
    setSupplierId(sourcingRow?.supplier_id ?? "");
    setSupplierItemNo(sourcingRow?.supplier_item_no ?? "");
  }
  const shipping = useShippingSettings();
  const preview = {
    production_min_days: numberOrNull(productionMin),
    production_max_days: numberOrNull(productionMax),
    inventory_source: product.inventory_source,
  };
  const rushPreview = rushLeadLabel(
    {
      production_min_days: null,
      rush_enabled: true,
      rush_production_min_days: numberOrNull(rushMin),
      rush_production_max_days: numberOrNull(rushMax),
      inventory_source: product.inventory_source,
      shipping_methods: shippingMethods,
    },
    shipping,
  );

  function changeShipping(value: string) {
    if (value === "sea_only" && rushEnabled) {
      if (
        !window.confirm(
          "Rush requires air shipping. Switching to Sea only will turn rush off. Continue?",
        )
      ) {
        return;
      }
      setRushEnabled(false);
    }
    setShippingMethods(value);
  }

  function numberOrNull(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const normalMin = numberOrNull(productionMin);
    const normalMax = numberOrNull(productionMax);
    const rushProductionMin = numberOrNull(rushMin);
    const rushProductionMax = numberOrNull(rushMax);
    if (normalMax != null) {
      if (normalMin == null) {
        toast.error("Enter a minimum production time before adding a maximum.");
        return;
      }
      if (normalMax < normalMin) {
        toast.error("The maximum production time must be the same as or longer than the minimum.");
        return;
      }
    }
    if (rushEnabled) {
      if (shippingMethods === "sea_only") {
        toast.error("Rush requires air shipping.");
        return;
      }
      if (rushProductionMin == null || rushProductionMin < 1) {
        toast.error("Please enter the rush production time in days.");
        return;
      }
      if (rushProductionMax != null && rushProductionMax < rushProductionMin) {
        toast.error(
          "The maximum rush production time must be the same as or longer than the minimum.",
        );
        return;
      }
      if (normalMin == null) {
        toast.error("Add a normal production time before offering rush.");
        return;
      }
      if (rushProductionMin >= normalMin) {
        toast.error("Rush production time must be shorter than the normal production time.");
        return;
      }
    }
    setSaving(true);
    // Writes go through the user's own authenticated client, so the staff-only
    // RLS policies on public.products are the enforcement point.
    const { error } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        moq: numberOrNull(moq),
        production_min_days: normalMin,
        production_max_days: normalMax,
        rush_enabled: rushEnabled,
        rush_production_min_days: rushEnabled ? rushProductionMin : null,
        rush_production_max_days: rushEnabled ? rushProductionMax : null,
        price: numberOrNull(price),
        show_price: showPrice,
        shipping_methods: shippingMethods,
        is_active: isActive,
        is_featured: isFeatured,
      })
      .eq("id", product.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    try {
      await saveProductSourcing({
        product_id: product.id,
        supplier_id: supplierId || null,
        supplier_item_no: supplierItemNo,
      });
      await queryClient.invalidateQueries({ queryKey: ["product_sourcing"] });
    } catch (sourcingError) {
      toast.error(
        sourcingError instanceof Error
          ? `Product saved, but sourcing didn't: ${sourcingError.message}`
          : "Product saved, but the sourcing details didn't.",
      );
      return;
    }
    toast.success("Product updated.");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Quick edit</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <p className="text-xs font-medium text-muted-foreground">{product.sku ?? "No SKU"}</p>

          <div>
            <Label htmlFor="qe-name">Name</Label>
            <Input id="qe-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="qe-moq">MOQ</Label>
            <Input
              id="qe-moq"
              inputMode="numeric"
              value={moq}
              placeholder="On request"
              onChange={(e) => setMoq(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="qe-production">Production time (days)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="qe-production"
                inputMode="numeric"
                value={productionMin}
                placeholder="min"
                onChange={(e) => setProductionMin(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">–</span>
              <Input
                id="qe-production-max"
                inputMode="numeric"
                value={productionMax}
                placeholder="optional"
                onChange={(e) => setProductionMax(e.target.value)}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Enter one number for a fixed time, or both for a range.
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Lead time shown to customers: air{" "}
              {airLeadLabel(preview, shipping) ?? "On request"} · sea{" "}
              {seaLeadLabel(preview, shipping) ?? "On request"}
            </p>
          </div>

          <div>
            <Label htmlFor="qe-shipping">Available shipping</Label>
            <Select value={shippingMethods} onValueChange={changeShipping}>
              <SelectTrigger id="qe-shipping">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIPPING_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-xl border border-n-200 p-3">
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Rush available
              <Switch
                checked={rushEnabled}
                disabled={shippingMethods === "sea_only"}
                onCheckedChange={setRushEnabled}
              />
            </label>
            {shippingMethods === "sea_only" ? (
              <p className="text-xs text-muted-foreground">Rush requires air shipping</p>
            ) : rushEnabled ? (
              <div>
                <Label htmlFor="qe-rush">Rush production time (days)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="qe-rush"
                    inputMode="numeric"
                    value={rushMin}
                    placeholder="min"
                    onChange={(e) => setRushMin(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">–</span>
                  <Input
                    id="qe-rush-max"
                    inputMode="numeric"
                    value={rushMax}
                    placeholder="optional"
                    onChange={(e) => setRushMax(e.target.value)}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Enter one number for a fixed time, or both for a range.
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  Rush lead time shown to customers: <RushChip size="static" />
                  <span className="text-n-700">{rushPreview ?? "—"}</span>
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <Label htmlFor="qe-price">Indicative price</Label>
            <Input
              id="qe-price"
              inputMode="decimal"
              value={price}
              placeholder="—"
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <SourcingSection
            idPrefix="qe"
            value={{ supplier_id: supplierId, supplier_item_no: supplierItemNo }}
            onChange={(patch) => {
              if (patch.supplier_id !== undefined) setSupplierId(patch.supplier_id);
              if (patch.supplier_item_no !== undefined) setSupplierItemNo(patch.supplier_item_no);
            }}
          />

          <div className="space-y-3 rounded-xl border border-n-200 p-3">
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Show price publicly
              <Switch checked={showPrice} onCheckedChange={setShowPrice} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              {isActive ? "Active" : "Hidden"}
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Featured
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              to="/admin/products"
              search={{ q: product.sku ?? product.name }}
              className="text-sm font-semibold text-navy-500 hover:text-navy-700 hover:underline"
            >
              Open full editor
            </Link>
            <Button onClick={save} disabled={saving} className="bg-navy-700 hover:bg-navy-800">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}