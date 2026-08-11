import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ChevronDown, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ProductPlaceholder } from "@/components/site/ProductPlaceholder";
import {
  EMPTY_FORM,
  ProductForm,
  formFromProduct,
  payloadFromForm,
  type FormState,
} from "@/components/admin/ProductForm";
import { supabase } from "@/integrations/supabase/client";
import {
  allProductsQuery,
  categoriesQuery,
  subcategoriesQuery,
  imageSrc,
  productImage,
  specValue,
  type Product,
} from "@/lib/catalog";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "all").default("all"),
  status: fallback(z.string(), "all").default("all"),
  nophoto: fallback(z.boolean(), false).default(false),
  page: fallback(z.number().int(), 1).default(1),
});

const PAGE_SIZE = 50;

export const Route = createFileRoute("/_authenticated/admin/products")({
  validateSearch: zodValidator(searchSchema),
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

function AdminProducts() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const products = useQuery(allProductsQuery);
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);

  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const setSearch = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }) });

  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name] as const)),
    [categories.data],
  );
  const subName = useMemo(
    () => new Map((subcategories.data ?? []).map((s) => [s.id, s.name] as const)),
    [subcategories.data],
  );

  const filtered = useMemo(() => {
    const term = search.q.trim().toLowerCase();
    return (products.data ?? []).filter((product) => {
      if (search.nophoto && (product.images ?? []).length > 0) return false;
      if (search.cat !== "all" && product.category_id !== search.cat) return false;
      if (search.status === "active" && !product.is_active) return false;
      if (search.status === "hidden" && product.is_active) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        (product.sku ?? "").toLowerCase().includes(term)
      );
    });
  }, [products.data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, search.page), totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const save = useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: FormState }) => {
      const payload = payloadFromForm(values);
      if (id) {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_result, variables) => {
      toast.success(variables.id ? "Product updated" : "Product created");
      setEditingId(null);
      setCreating(false);
      setForm(EMPTY_FORM);
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
      setPendingDelete(null);
      setOpenId(null);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function startEdit(product: Product) {
    setForm(formFromProduct(product));
    setEditingId(product.id);
  }

  function startDuplicate(product: Product) {
    setForm({ ...formFromProduct(product), name: `Copy of ${product.name}`, sku: "" });
    setEditingId(null);
    setCreating(true);
    toast.info("Give the copy a new SKU before saving.");
  }

  const noPhotoCount = (products.data ?? []).filter((p) => (p.images ?? []).length === 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setEditingId(null);
            setCreating(true);
          }}
        >
          <Plus className="size-4" />
          New product
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Input
          value={search.q}
          onChange={(event) => setSearch({ q: event.target.value })}
          placeholder="Search by name or SKU"
          className="w-full max-w-xs"
        />
        <Select value={search.cat} onValueChange={(value) => setSearch({ cat: value })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={search.status} onValueChange={(value) => setSearch({ status: value })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={search.nophoto}
            onCheckedChange={(value) => setSearch({ nophoto: value })}
          />
          Missing photos only
        </label>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {filtered.length} of {(products.data ?? []).length} products · {noPhotoCount} without photos
      </p>

      <div className="mt-4 space-y-2">
        {products.isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))
          : pageItems.map((product) => {
              const isOpen = openId === product.id;
              const isEditing = isOpen && editingId === product.id;
              const cover = productImage(product);
              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/50"
                    aria-expanded={isOpen}
                    onClick={() => {
                      setOpenId(isOpen ? null : product.id);
                      setEditingId(null);
                    }}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={product.name}
                        loading="lazy"
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <ProductPlaceholder className="size-12 shrink-0 rounded-lg" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.sku ? `${product.sku} · ` : ""}
                        {categoryName.get(product.category_id ?? "") ?? "—"}
                        {product.subcategory_id
                          ? ` › ${subName.get(product.subcategory_id) ?? ""}`
                          : ""}
                      </p>
                    </div>
                    <div className="hidden shrink-0 gap-1.5 sm:flex">
                      {!product.is_active ? <Badge>Hidden</Badge> : null}
                      {(product.images ?? []).length === 0 ? <Badge>No photo</Badge> : null}
                      {product.is_featured ? <Badge>Featured</Badge> : null}
                    </div>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen ? (
                    <div className="animate-in fade-in slide-in-from-top-1 border-t border-border p-4">
                      {isEditing ? (
                        <ProductForm
                          form={form}
                          setForm={setForm}
                          categories={categories.data ?? []}
                          subcategories={subcategories.data ?? []}
                          saving={save.isPending}
                          submitLabel="Save changes"
                          idPrefix={`edit-${product.id}`}
                          onSubmit={() => save.mutate({ id: product.id, values: form })}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <ProductSummary
                          product={product}
                          onEdit={() => startEdit(product)}
                          onDuplicate={() => startDuplicate(product)}
                          onDelete={() => setPendingDelete(product)}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
        {!products.isLoading && pageItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No products match these filters.
          </p>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Sheet
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setForm(EMPTY_FORM);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>New product</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            <ProductForm
              form={form}
              setForm={setForm}
              categories={categories.data ?? []}
              subcategories={subcategories.data ?? []}
              saving={save.isPending}
              submitLabel="Create product"
              idPrefix="new"
              onSubmit={() => save.mutate({ id: null, values: form })}
              onCancel={() => {
                setCreating(false);
                setForm(EMPTY_FORM);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be removed from the catalogue for good. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete.id);
              }}
            >
              Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function ProductSummary({
  product,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-5">
      {(product.images ?? []).length ? (
        <div className="flex flex-wrap gap-2">
          {product.images.map((image) => (
            <img
              key={image}
              src={imageSrc(image)}
              alt=""
              loading="lazy"
              className="size-16 rounded-lg border border-border object-cover"
            />
          ))}
        </div>
      ) : (
        <ProductPlaceholder className="size-16 rounded-lg" />
      )}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Spec label="MOQ" value={specValue(product.moq)} />
        <Spec label="Production" value={specValue(product.production_days, "days")} />
        <Spec label="Colour options" value={product.colour_option ?? ""} />
        <Spec label="Inventory source" value={product.inventory_source} />
        <Spec label="Material" value={product.material ?? ""} />
        <Spec label="Size" value={product.size ?? ""} />
        <Spec label="Capacity" value={product.capacity ?? ""} />
        <Spec label="Weight" value={product.weight ?? ""} />
        <Spec label="Features" value={product.features ?? ""} />
        <Spec
          label="Price"
          value={product.price == null ? "" : `$${Number(product.price).toFixed(2)}`}
        />
      </div>

      <Spec label="Decoration methods" value={(product.decoration_methods ?? []).join(", ")} />

      {product.description ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Short description
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">{product.description}</p>
        </div>
      ) : null}
      {product.details ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Details
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">{product.details}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onEdit}>
          <Pencil className="size-4" />
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          <Copy className="size-4" />
          Duplicate
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
