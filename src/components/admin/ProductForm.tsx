import { Trash2, Upload } from "lucide-react";
import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  COLOUR_OPTIONS,
  DECORATION_METHODS,
  INVENTORY_SOURCES,
  SHIPPING_METHOD_OPTIONS,
  imageSrc,
  slugify,
  type Category,
  type Product,
  type Subcategory,
} from "@/lib/catalog";
import { airLeadLabel, rushLeadLabel, seaLeadLabel, useShippingSettings } from "@/lib/shipping";

export type FormState = {
  name: string;
  sku: string;
  moq: string;
  production_min_days: string;
  production_max_days: string;
  shipping_methods: string;
  rush_enabled: boolean;
  rush_production_min_days: string;
  rush_production_max_days: string;
  colour_option: string;
  decoration_methods: string[];
  inventory_source: string;
  material: string;
  size: string;
  capacity: string;
  weight: string;
  features: string;
  category_id: string;
  subcategory_id: string;
  description: string;
  details: string;
  price: string;
  show_price: boolean;
  is_active: boolean;
  is_featured: boolean;
  images: string[];
};

export const EMPTY_FORM: FormState = {
  name: "",
  sku: "",
  moq: "",
  production_min_days: "",
  production_max_days: "",
  shipping_methods: "air_sea",
  rush_enabled: false,
  rush_production_min_days: "",
  rush_production_max_days: "",
  colour_option: "Fully Customised",
  decoration_methods: [],
  inventory_source: "Factory Direct",
  material: "",
  size: "",
  capacity: "",
  weight: "",
  features: "",
  category_id: "",
  subcategory_id: "",
  description: "",
  details: "",
  price: "",
  show_price: true,
  is_active: true,
  is_featured: false,
  images: [],
};

export function formFromProduct(product: Product): FormState {
  return {
    name: product.name,
    sku: product.sku ?? "",
    moq: product.moq == null ? "" : String(product.moq),
    production_min_days:
      product.production_min_days == null ? "" : String(product.production_min_days),
    production_max_days:
      product.production_max_days == null ? "" : String(product.production_max_days),
    shipping_methods: product.shipping_methods ?? "air_sea",
    rush_enabled: product.rush_enabled ?? false,
    rush_production_min_days:
      product.rush_production_min_days == null ? "" : String(product.rush_production_min_days),
    rush_production_max_days:
      product.rush_production_max_days == null ? "" : String(product.rush_production_max_days),
    colour_option: product.colour_option ?? "Fully Customised",
    decoration_methods: product.decoration_methods ?? [],
    inventory_source: product.inventory_source ?? "Factory Direct",
    material: product.material ?? "",
    size: product.size ?? "",
    capacity: product.capacity ?? "",
    weight: product.weight ?? "",
    features: product.features ?? "",
    category_id: product.category_id ?? "",
    subcategory_id: product.subcategory_id ?? "",
    description: product.description ?? "",
    details: product.details ?? "",
    price: product.price == null ? "" : String(product.price),
    show_price: product.show_price,
    is_active: product.is_active,
    is_featured: product.is_featured,
    images: product.images ?? [],
  };
}

/** Blank/invalid text becomes null so "on request" and fixed times both work. */
function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function payloadFromForm(form: FormState) {
  return {
    name: form.name.trim(),
    sku: form.sku.trim(),
    moq: numberOrNull(form.moq),
    production_min_days: numberOrNull(form.production_min_days),
    production_max_days: numberOrNull(form.production_max_days),
    shipping_methods: form.shipping_methods || "air_sea",
    rush_enabled: form.rush_enabled,
    rush_production_min_days: form.rush_enabled
      ? numberOrNull(form.rush_production_min_days)
      : null,
    rush_production_max_days: form.rush_enabled
      ? numberOrNull(form.rush_production_max_days)
      : null,
    colour_option: form.colour_option,
    decoration_methods: form.decoration_methods,
    inventory_source: form.inventory_source,
    material: form.material || null,
    size: form.size || null,
    capacity: form.capacity || null,
    weight: form.weight || null,
    features: form.features || null,
    slug: slugify(form.name),
    category_id: form.category_id || null,
    subcategory_id: form.subcategory_id,
    description: form.description || null,
    details: form.details || null,
    price: form.price ? Number(form.price) : null,
    show_price: form.show_price,
    is_active: form.is_active,
    is_featured: form.is_featured,
    images: form.images,
  };
}

/** Returns a friendly problem message, or null when the form is ready to save. */
export function validateForm(form: FormState): string | null {
  if (!form.name.trim()) return "Please give the product a name.";
  if (!form.sku.trim()) return "Please enter a SKU (product code).";
  if (!form.subcategory_id) return "Please choose a category and subcategory.";
  const normalMin = numberOrNull(form.production_min_days);
  const normalMax = numberOrNull(form.production_max_days);
  if (normalMax != null) {
    if (normalMin == null) return "Enter a minimum production time before adding a maximum.";
    if (normalMax < normalMin)
      return "The maximum production time must be the same as or longer than the minimum.";
  }
  if (form.rush_enabled) {
    if (form.shipping_methods === "sea_only") return "Rush requires air shipping.";
    const rushMin = numberOrNull(form.rush_production_min_days);
    const rushMax = numberOrNull(form.rush_production_max_days);
    if (rushMin == null || rushMin < 1) return "Please enter the rush production time in days.";
    if (rushMax != null && rushMax < rushMin)
      return "The maximum rush production time must be the same as or longer than the minimum.";
    if (normalMin == null) return "Add a normal production time before offering rush.";
    if (rushMin >= normalMin)
      return "Rush production time must be shorter than the normal production time.";
  }
  return null;
}

/** Rush shares the normal air shipping buffer — only the production time changes. */
function RushPreview({
  rushMin,
  rushMax,
  source,
}: {
  rushMin: string;
  rushMax: string;
  source: string;
}) {
  const shipping = useShippingSettings();
  const value = {
    production_min_days: null,
    rush_enabled: true,
    rush_production_min_days: numberOrNull(rushMin),
    rush_production_max_days: numberOrNull(rushMax),
    inventory_source: source,
  };
  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      Rush lead time shown to customers: {rushLeadLabel(value, shipping) ?? "—"}
    </p>
  );
}

/**
 * Customer-facing lead times are derived from production time plus the global
 * shipping windows, so the form shows them read-only.
 */
function LeadPreview({
  productionMin,
  productionMax,
  source,
}: {
  productionMin: string;
  productionMax: string;
  source: string;
}) {
  const shipping = useShippingSettings();
  const value = {
    production_min_days: numberOrNull(productionMin),
    production_max_days: numberOrNull(productionMax),
    inventory_source: source,
  };
  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      Lead time shown to customers: air {airLeadLabel(value, shipping) ?? "On request"} · sea{" "}
      {seaLeadLabel(value, shipping) ?? "On request"}
    </p>
  );
}

type Props = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  categories: Category[];
  subcategories: Subcategory[];
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  idPrefix: string;
};

export function ProductForm({
  form,
  setForm,
  categories,
  subcategories,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
  idPrefix,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const id = (key: string) => `${idPrefix}-${key}`;

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      setForm((prev) => ({ ...prev, images: [...prev.images, path] }));
      toast.success("Image uploaded");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = validateForm(form);
        if (problem) {
          toast.error(problem);
          return;
        }
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={id("name")}>Name</Label>
          <Input
            id={id("name")}
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor={id("sku")}>SKU (product code)</Label>
          <Input
            id={id("sku")}
            value={form.sku}
            onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
            placeholder="e.g. 102009"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select
            value={form.category_id}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, category_id: value, subcategory_id: "" }))
            }
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subcategory</Label>
          <Select
            value={form.subcategory_id}
            disabled={!form.category_id}
            onValueChange={(value) => setForm((prev) => ({ ...prev, subcategory_id: value }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue
                placeholder={form.category_id ? "Select subcategory" : "Pick a category first"}
              />
            </SelectTrigger>
            <SelectContent>
              {subcategories
                .filter((sub) => sub.category_id === form.category_id)
                .map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={id("price")}>Indicative price (USD)</Label>
          <Input
            id={id("price")}
            type="number"
            step="0.01"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor={id("moq")}>Minimum order quantity (MOQ)</Label>
          <Input
            id={id("moq")}
            type="number"
            min={1}
            value={form.moq}
            onChange={(event) => setForm((prev) => ({ ...prev, moq: event.target.value }))}
            placeholder="Leave blank for On request"
          />
        </div>
        <div>
          <Label htmlFor={id("days")}>Production time (days)</Label>
          <Input
            id={id("days")}
            type="number"
            min={1}
            value={form.production_days}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, production_days: event.target.value }))
            }
            placeholder="Leave blank for On request"
          />
          <LeadPreview production={form.production_days} source={form.inventory_source} />
        </div>
        <div>
          <Label htmlFor={id("shipping-methods")}>Available shipping</Label>
          <Select
            value={form.shipping_methods}
            onValueChange={(value) =>
              setForm((prev) => {
                if (value === "sea_only" && prev.rush_enabled) {
                  if (
                    !window.confirm(
                      "Rush requires air shipping. Switching to Sea only will turn rush off. Continue?",
                    )
                  ) {
                    return prev;
                  }
                  return { ...prev, shipping_methods: value, rush_enabled: false };
                }
                return { ...prev, shipping_methods: value };
              })
            }
          >
            <SelectTrigger id={id("shipping-methods")}>
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
        <div className="sm:col-span-2">
          <div className="rounded-xl border border-border p-3">
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Rush available
              <Switch
                checked={form.rush_enabled}
                disabled={form.shipping_methods === "sea_only"}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, rush_enabled: checked }))
                }
              />
            </label>
            {form.shipping_methods === "sea_only" ? (
              <p className="mt-1.5 text-xs text-muted-foreground">Rush requires air shipping</p>
            ) : form.rush_enabled ? (
              <div className="mt-3">
                <Label htmlFor={id("rush-days")}>Rush production time (days)</Label>
                <Input
                  id={id("rush-days")}
                  type="number"
                  min={1}
                  value={form.rush_production_days}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, rush_production_days: event.target.value }))
                  }
                  placeholder="Must be less than the normal production time"
                />
                <RushPreview
                  rushProduction={form.rush_production_days}
                  source={form.inventory_source}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <Label htmlFor={id("material")}>Material</Label>
          <Input
            id={id("material")}
            value={form.material}
            onChange={(event) => setForm((prev) => ({ ...prev, material: event.target.value }))}
            placeholder="e.g. 18/8 Stainless Steel"
          />
        </div>
        <div>
          <Label htmlFor={id("size")}>Size</Label>
          <Input
            id={id("size")}
            value={form.size}
            onChange={(event) => setForm((prev) => ({ ...prev, size: event.target.value }))}
            placeholder="e.g. 1.5cm x 35cm"
          />
        </div>
        <div>
          <Label htmlFor={id("capacity")}>Capacity</Label>
          <Input
            id={id("capacity")}
            value={form.capacity}
            onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
            placeholder="e.g. 500ml"
          />
        </div>
        <div>
          <Label htmlFor={id("weight")}>Weight</Label>
          <Input
            id={id("weight")}
            value={form.weight}
            onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
            placeholder="e.g. 242g"
          />
        </div>
        <div>
          <Label htmlFor={id("features")}>Features</Label>
          <Input
            id={id("features")}
            value={form.features}
            onChange={(event) => setForm((prev) => ({ ...prev, features: event.target.value }))}
            placeholder="e.g. Handle & Pouch"
          />
        </div>
        <div>
          <Label>Colour options</Label>
          <Select
            value={form.colour_option}
            onValueChange={(value) => setForm((prev) => ({ ...prev, colour_option: value }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOUR_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Inventory source</Label>
          <Select
            value={form.inventory_source}
            onValueChange={(value) => setForm((prev) => ({ ...prev, inventory_source: value }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVENTORY_SOURCES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Decoration methods</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DECORATION_METHODS.map((method) => (
              <label key={method} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.decoration_methods.includes(method)}
                  onCheckedChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      decoration_methods: prev.decoration_methods.includes(method)
                        ? prev.decoration_methods.filter((value) => value !== method)
                        : [...prev.decoration_methods, method],
                    }))
                  }
                />
                {method}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.show_price}
              onCheckedChange={(value) => setForm((prev) => ({ ...prev, show_price: value }))}
            />
            Show price
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.is_active}
              onCheckedChange={(value) => setForm((prev) => ({ ...prev, is_active: value }))}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.is_featured}
              onCheckedChange={(value) => setForm((prev) => ({ ...prev, is_featured: value }))}
            />
            Featured
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor={id("desc")}>Short description</Label>
        <Textarea
          id={id("desc")}
          rows={2}
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor={id("details")}>Details / specifications</Label>
        <Textarea
          id={id("details")}
          rows={4}
          value={form.details}
          onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor={id("image")}>Images</Label>
        <label
          htmlFor={id("image")}
          className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary"
        >
          <Upload className="size-4" />
          {uploading ? "Uploading…" : "Upload an image"}
        </label>
        <input
          id={id("image")}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
        {form.images.length ? (
          <>
            <p className="mt-3 text-xs text-muted-foreground">
              Drag an image to reorder. The first image is the cover shown on the product card.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {form.images.map((image, index) => (
                <div
                  key={image}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragIndex === null || dragIndex === index) return;
                    setForm((prev) => {
                      const next = [...prev.images];
                      const moved = next.splice(dragIndex, 1)[0];
                      if (moved === undefined) return prev;
                      next.splice(index, 0, moved);
                      return { ...prev, images: next };
                    });
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`relative cursor-grab active:cursor-grabbing ${
                    dragIndex === index ? "opacity-50" : ""
                  }`}
                >
                  <img
                    src={imageSrc(image)}
                    alt=""
                    loading="lazy"
                    className="size-20 rounded-lg border border-border object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-n-900/80 py-0.5 text-center text-[10px] font-semibold uppercase text-white">
                      Cover
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        images: prev.images.filter((value) => value !== image),
                      }))
                    }
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
