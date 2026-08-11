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
  imageSrc,
  slugify,
  type Category,
  type Product,
  type Subcategory,
} from "@/lib/catalog";

export type FormState = {
  name: string;
  sku: string;
  moq: string;
  production_days: string;
  air_lead_min: string;
  air_lead_max: string;
  sea_lead_min: string;
  sea_lead_max: string;
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
  production_days: "",
  air_lead_min: "",
  air_lead_max: "",
  sea_lead_min: "",
  sea_lead_max: "",
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
    production_days: product.production_days == null ? "" : String(product.production_days),
    air_lead_min: product.air_lead_min == null ? "" : String(product.air_lead_min),
    air_lead_max: product.air_lead_max == null ? "" : String(product.air_lead_max),
    sea_lead_min: product.sea_lead_min == null ? "" : String(product.sea_lead_min),
    sea_lead_max: product.sea_lead_max == null ? "" : String(product.sea_lead_max),
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

export function payloadFromForm(form: FormState) {
  return {
    name: form.name.trim(),
    sku: form.sku.trim(),
    moq: form.moq.trim() ? Number(form.moq) : null,
    production_days: form.production_days.trim() ? Number(form.production_days) : null,
    air_lead_min: form.air_lead_min.trim() ? Number(form.air_lead_min) : null,
    air_lead_max: form.air_lead_max.trim() ? Number(form.air_lead_max) : null,
    sea_lead_min: form.sea_lead_min.trim() ? Number(form.sea_lead_min) : null,
    sea_lead_max: form.sea_lead_max.trim() ? Number(form.sea_lead_max) : null,
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
  const problem = validateLeadTimes(form);
  if (problem) return problem;
  return null;
}

/** Each lead-time pair may be left empty, but a maximum can never be below its minimum. */
export function validateLeadTimes(form: {
  air_lead_min: string;
  air_lead_max: string;
  sea_lead_min: string;
  sea_lead_max: string;
}): string | null {
  const pairs = [
    { label: "air", min: form.air_lead_min, max: form.air_lead_max },
    { label: "sea", min: form.sea_lead_min, max: form.sea_lead_max },
  ];
  for (const pair of pairs) {
    if (!pair.min.trim() || !pair.max.trim()) continue;
    if (Number(pair.max) < Number(pair.min)) {
      return `The longest ${pair.label} lead time can't be shorter than the shortest one.`;
    }
  }
  return null;
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
        <div className="sm:col-span-2">
          <Label>Lead time (days shown to customers)</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Leave a pair blank to show "On request" for that shipping method.
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor={id("air-min")} className="text-xs">
                Air — fastest
              </Label>
              <Input
                id={id("air-min")}
                type="number"
                min={0}
                value={form.air_lead_min}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, air_lead_min: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor={id("air-max")} className="text-xs">
                Air — slowest
              </Label>
              <Input
                id={id("air-max")}
                type="number"
                min={0}
                value={form.air_lead_max}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, air_lead_max: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor={id("sea-min")} className="text-xs">
                Sea — fastest
              </Label>
              <Input
                id={id("sea-min")}
                type="number"
                min={0}
                value={form.sea_lead_min}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sea_lead_min: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor={id("sea-max")} className="text-xs">
                Sea — slowest
              </Label>
              <Input
                id={id("sea-max")}
                type="number"
                min={0}
                value={form.sea_lead_max}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sea_lead_max: event.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor={id("days")}>Production time (days) — internal reference</Label>
          <Input
            id={id("days")}
            type="number"
            min={1}
            value={form.production_days}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, production_days: event.target.value }))
            }
            placeholder="Not shown on the public site"
          />
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
