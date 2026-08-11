import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/catalog";
import { airLeadLabel, seaLeadLabel, useShippingSettings } from "@/lib/shipping";

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
  const [productionDays, setProductionDays] = useState(
    product.production_days == null ? "" : String(product.production_days),
  );
  const [price, setPrice] = useState(product.price == null ? "" : String(product.price));
  const [showPrice, setShowPrice] = useState(product.show_price);
  const [isActive, setIsActive] = useState(product.is_active);
  const [isFeatured, setIsFeatured] = useState(product.is_featured);
  const [saving, setSaving] = useState(false);
  const shipping = useShippingSettings();
  const parsedProduction = productionDays.trim() ? Number(productionDays) : null;
  const preview = {
    production_days: Number.isFinite(parsedProduction as number) ? parsedProduction : null,
    inventory_source: product.inventory_source,
  };

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
    setSaving(true);
    // Writes go through the user's own authenticated client, so the staff-only
    // RLS policies on public.products are the enforcement point.
    const { error } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        moq: numberOrNull(moq),
        production_days: numberOrNull(productionDays),
        price: numberOrNull(price),
        show_price: showPrice,
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
            <Input
              id="qe-production"
              inputMode="numeric"
              value={productionDays}
              placeholder="On request"
              onChange={(e) => setProductionDays(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Lead time shown to customers: air{" "}
              {airLeadLabel(preview, shipping) ?? "On request"} · sea{" "}
              {seaLeadLabel(preview, shipping) ?? "On request"}
            </p>
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