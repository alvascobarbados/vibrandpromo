import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  allProductsQuery,
  categoriesQuery,
  COLOUR_OPTIONS,
  DECORATION_METHODS,
  INVENTORY_SOURCES,
  productImage,
  slugify,
  type Product,
} from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Products | Vibrand Admin" },
      { name: "description", content: "Create, edit and publish catalogue products." },
      { property: "og:title", content: "Products | Vibrand Admin" },
      { property: "og:description", content: "Manage the Vibrand product catalogue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminProducts,
});

type FormState = {
  name: string;
  sku: string;
  moq: string;
  production_days: string;
  colour_option: string;
  decoration_methods: string[];
  inventory_source: string;
  material: string;
  category_id: string;
  description: string;
  details: string;
  price: string;
  show_price: boolean;
  is_active: boolean;
  is_featured: boolean;
  images: string[];
};

const EMPTY: FormState = {
  name: "",
  sku: "",
  moq: "25",
  production_days: "14",
  colour_option: "Fully Customised",
  decoration_methods: [],
  inventory_source: "Factory Direct",
  material: "",
  category_id: "",
  description: "",
  details: "",
  price: "",
  show_price: true,
  is_active: true,
  is_featured: false,
  images: [],
};

function AdminProducts() {
  const queryClient = useQueryClient();
  const products = useQuery(allProductsQuery);
  const categories = useQuery(categoriesQuery);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  function startEdit(product: Product) {
    setEditing(product.id);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      moq: String(product.moq ?? 25),
      production_days: String(product.production_days ?? 14),
      colour_option: product.colour_option ?? "Fully Customised",
      decoration_methods: product.decoration_methods ?? [],
      inventory_source: product.inventory_source ?? "Factory Direct",
      material: product.material ?? "",
      category_id: product.category_id ?? "",
      description: product.description ?? "",
      details: product.details ?? "",
      price: product.price == null ? "" : String(product.price),
      show_price: product.show_price,
      is_active: product.is_active,
      is_featured: product.is_featured,
      images: product.images ?? [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        sku: form.sku.trim(),
        moq: Number(form.moq) || 1,
        production_days: Number(form.production_days) || 1,
        colour_option: form.colour_option,
        decoration_methods: form.decoration_methods,
        inventory_source: form.inventory_source,
        material: form.material || null,
        slug: slugify(form.name),
        category_id: form.category_id || null,
        description: form.description || null,
        details: form.details || null,
        price: form.price ? Number(form.price) : null,
        show_price: form.show_price,
        is_active: form.is_active,
        is_featured: form.is_featured,
        images: form.images,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product created");
      setEditing(null);
      setForm(EMPTY);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((prev) => ({ ...prev, images: [...prev.images, data.publicUrl] }));
      toast.success("Image uploaded");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Products</h1>

      <form
        className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.name.trim()) {
            toast.error("Product name is required");
            return;
          }
          if (!form.sku.trim()) {
            toast.error("SKU is required");
            return;
          }
          save.mutate();
        }}
      >
        <h2 className="font-semibold">{editing ? "Edit product" : "New product"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="p-name">Name</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.category_id}
              onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(categories.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="p-price">Indicative price (USD)</Label>
            <Input
              id="p-price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="p-sku">SKU (product code)</Label>
            <Input
              id="p-sku"
              value={form.sku}
              onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
              placeholder="e.g. 102009"
            />
          </div>
          <div>
            <Label htmlFor="p-moq">Minimum order quantity (MOQ)</Label>
            <Input
              id="p-moq"
              type="number"
              min={1}
              value={form.moq}
              onChange={(event) => setForm((prev) => ({ ...prev, moq: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="p-days">Production time (days)</Label>
            <Input
              id="p-days"
              type="number"
              min={1}
              value={form.production_days}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, production_days: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="p-material">Material</Label>
            <Input
              id="p-material"
              value={form.material}
              onChange={(event) => setForm((prev) => ({ ...prev, material: event.target.value }))}
              placeholder="e.g. 18/8 Stainless Steel"
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
          <div className="flex flex-wrap items-center gap-6 pt-6">
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
          <Label htmlFor="p-desc">Short description</Label>
          <Textarea
            id="p-desc"
            rows={2}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="p-details">Details / specifications</Label>
          <Textarea
            id="p-details"
            rows={4}
            value={form.details}
            onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="p-image">Images</Label>
          <label
            htmlFor="p-image"
            className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary"
          >
            <Upload className="size-4" />
            {uploading ? "Uploading…" : "Upload an image"}
          </label>
          <input
            id="p-image"
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
                    src={image}
                    alt=""
                    loading="lazy"
                    className="size-20 rounded-lg border border-border object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-charcoal/80 py-0.5 text-center text-[10px] font-semibold uppercase text-white">
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

        <div className="flex gap-3">
          <Button type="submit" disabled={save.isPending}>
            {editing ? "Save changes" : "Create product"}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-8 space-y-2">
        {products.isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))
          : (products.data ?? []).map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-3"
              >
                <img
                  src={productImage(product)}
                  alt={product.name}
                  loading="lazy"
                  className="size-14 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.is_active ? "Active" : "Hidden"}
                    {product.is_featured ? " · Featured" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${product.name}`}
                  onClick={() => startEdit(product)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${product.name}`}
                  onClick={() => remove.mutate(product.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
      </div>
    </div>
  );
}