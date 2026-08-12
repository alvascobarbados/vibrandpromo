import { requirePage } from "@/lib/admin-guard";
import {
  adminProductRowsQuery,
  rowSourcing,
  saveProductSourcing,
  suppliersQuery,
  supplierLabel,
  type AdminProductRow,
} from "@/lib/sourcing";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
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
import { SourceDot } from "@/components/site/SourceDot";
import {
  EMPTY_FORM,
  ProductForm,
  formFromProduct,
  payloadFromForm,
  type FormState,
} from "@/components/admin/ProductForm";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriesQuery,
  subcategoriesQuery,
  imageSrc,
  productImage,
  productionLabel,
  specValue,
  type Product,
} from "@/lib/catalog";
import { airLeadLabel, seaLeadLabel, useShippingSettings } from "@/lib/shipping";
import {
  CHEVRON_WIDTH,
  DEFAULT_COL_WIDTHS,
  THUMB_WIDTH,
  minWidthFor,
  useColumnWidths,
  type ColId,
} from "@/lib/column-widths";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "all").default("all"),
  status: fallback(z.string(), "all").default("all"),
  nophoto: fallback(z.boolean(), false).default(false),
  supplier: fallback(z.string(), "all").default("all"),
  sort: fallback(z.string(), "default").default("default"),
  dir: fallback(z.string(), "asc").default("asc"),
  page: fallback(z.number().int(), 1).default(1),
});

type ProductSearch = z.infer<typeof searchSchema>;

const PAGE_SIZE = 50;

type SortKey = "cat" | "supplier" | "name" | "sku" | "moq" | "prod";

export const Route = createFileRoute("/_authenticated/admin/products")({
  beforeLoad: ({ context }) => requirePage(context.access, "products"),
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
  const products = useQuery(adminProductRowsQuery);
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const suppliers = useQuery(suppliersQuery);
  const columns = useColumnWidths();
  const dragged = useRef(false);

  const [openIds, setOpenIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const setSearch = (patch: Partial<ProductSearch>) =>
    void navigate({ search: (prev: ProductSearch) => ({ ...prev, page: 1, ...patch }) });

  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name] as const)),
    [categories.data],
  );
  const subName = useMemo(
    () => new Map((subcategories.data ?? []).map((s) => [s.id, s.name] as const)),
    [subcategories.data],
  );

  const rows = products.data ?? [];

  /** Supplier counts drive both the dropdown labels and the footer bar. */
  const supplierCounts = useMemo(() => {
    const map = new Map<string, number>();
    let unassigned = 0;
    for (const row of rows) {
      const id = rowSourcing(row)?.supplier_id ?? null;
      if (!id) unassigned += 1;
      else map.set(id, (map.get(id) ?? 0) + 1);
    }
    return { map, unassigned };
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.q.trim().toLowerCase();
    return rows.filter((product) => {
      if (search.nophoto && (product.images ?? []).length > 0) return false;
      if (search.cat !== "all" && product.category_id !== search.cat) return false;
      if (search.status === "active" && !product.is_active) return false;
      if (search.status === "hidden" && product.is_active) return false;
      if (search.supplier !== "all") {
        const supplierId = rowSourcing(product)?.supplier_id ?? null;
        if (search.supplier === "none" ? supplierId !== null : supplierId !== search.supplier)
          return false;
      }
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        (product.sku ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  /** Sorting is client-side over the loaded rows; "default" keeps the query order. */
  const sorted = useMemo(() => {
    if (search.sort === "default") return filtered;
    const factor = search.dir === "desc" ? -1 : 1;
    const text = (value: string | null | undefined) => (value ?? "").toLowerCase();
    const num = (value: number | null | undefined) =>
      value == null ? Number.POSITIVE_INFINITY : value;
    const key = search.sort as SortKey;
    const value = (row: AdminProductRow): string | number => {
      switch (key) {
        case "cat":
          return text(categoryName.get(row.category_id ?? ""));
        case "supplier": {
          const supplier = rowSourcing(row)?.suppliers;
          return supplier ? text(`${supplier.code} ${supplier.name}`) : "zzzz";
        }
        case "name":
          return text(row.name);
        case "sku":
          return text(row.sku);
        case "moq":
          return num(row.moq);
        case "prod":
          return num(row.production_min_days);
      }
    };
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [filtered, search.sort, search.dir, categoryName]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, search.page), totalPages);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const save = useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: FormState }) => {
      const payload = payloadFromForm(values);
      let productId = id;
      if (id) {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        productId = data?.id ?? null;
      }
      // Sourcing lives in its own staff-only table, so it is a second write.
      if (productId) {
        await saveProductSourcing({
          product_id: productId,
          supplier_id: values.supplier_id || null,
          supplier_item_no: values.supplier_item_no,
        });
      }
    },
    onSuccess: (_result, variables) => {
      toast.success(variables.id ? "Product updated" : "Product created");
      setEditingId(null);
      setCreating(false);
      setForm(EMPTY_FORM);
      void invalidate();
      void queryClient.invalidateQueries({ queryKey: ["product_sourcing"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_result, id) => {
      toast.success("Product deleted");
      setPendingDelete(null);
      setOpenIds((prev) => prev.filter((value) => value !== id));
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function startEdit(product: AdminProductRow) {
    setForm(formFromProduct(product, rowSourcing(product)));
    setEditingId(product.id);
  }

  function startDuplicate(product: AdminProductRow) {
    setForm({
      ...formFromProduct(product, rowSourcing(product)),
      name: `Copy of ${product.name}`,
      sku: "",
    });
    setEditingId(null);
    setCreating(true);
    toast.info("Give the copy a new SKU before saving.");
  }

  const noPhotoCount = rows.filter((p) => (p.images ?? []).length === 0).length;
  const activeCount = rows.filter((p) => p.is_active).length;

  function toggleSort(key: SortKey) {
    if (search.sort !== key) return setSearch({ sort: key, dir: "asc" });
    if (search.dir === "asc") return setSearch({ sort: key, dir: "desc" });
    return setSearch({ sort: "default", dir: "asc" });
  }

  const chips: Array<{ label: string; clear: () => void }> = [];
  if (search.q.trim())
    chips.push({ label: `Search: ${search.q.trim()}`, clear: () => setSearch({ q: "" }) });
  if (search.cat !== "all")
    chips.push({
      label: categoryName.get(search.cat) ?? "Category",
      clear: () => setSearch({ cat: "all" }),
    });
  if (search.status !== "all")
    chips.push({
      label: search.status === "active" ? "Active" : "Hidden",
      clear: () => setSearch({ status: "all" }),
    });
  if (search.supplier !== "all")
    chips.push({
      label:
        search.supplier === "none"
          ? "Unassigned supplier"
          : (() => {
              const supplier = (suppliers.data ?? []).find((s) => s.id === search.supplier);
              return supplier ? supplierLabel(supplier) : "Supplier";
            })(),
      clear: () => setSearch({ supplier: "all" }),
    });
  if (search.nophoto)
    chips.push({ label: "Missing photos only", clear: () => setSearch({ nophoto: false }) });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex flex-wrap items-center gap-2">
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
        <Select value={search.supplier} onValueChange={(value) => setSearch({ supplier: value })}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            <SelectItem value="none">Unassigned ({supplierCounts.unassigned})</SelectItem>
            {(suppliers.data ?? []).map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplierLabel(supplier)} ({supplierCounts.map.get(supplier.id) ?? 0})
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

      {chips.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.clear}
              className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700 hover:bg-navy-100"
            >
              <span className="truncate">{chip.label}</span>
              <X className="size-3 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-sm text-muted-foreground">
        {filtered.length} of {rows.length} products · {noPhotoCount} without photos
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table
          className="w-full border-collapse text-sm"
          style={{ tableLayout: "fixed", minWidth: `${columns.totalWidth}px` }}
        >
          <colgroup>
            <col style={{ width: `${THUMB_WIDTH}px` }} />
            {(Object.keys(DEFAULT_COL_WIDTHS) as ColId[]).map((id) => (
              <col key={id} style={{ width: `${columns.widths[id]}px` }} />
            ))}
            <col style={{ width: `${CHEVRON_WIDTH}px` }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <Th />
              <Th sortKey="cat" search={search} onSort={toggleSort} colId="cat" columns={columns} dragged={dragged}>
                Category
              </Th>
              <Th colId="subcat" columns={columns} dragged={dragged}>
                Subcategory
              </Th>
              <Th sortKey="supplier" search={search} onSort={toggleSort} colId="supplier" columns={columns} dragged={dragged}>
                Supplier
              </Th>
              <Th sortKey="name" search={search} onSort={toggleSort} colId="name" columns={columns} dragged={dragged}>
                Item name
              </Th>
              <Th sortKey="sku" search={search} onSort={toggleSort} colId="sku" columns={columns} dragged={dragged}>
                SKU
              </Th>
              <Th colId="supitem" columns={columns} dragged={dragged}>
                Supplier item #
              </Th>
              <Th
                sortKey="moq"
                search={search}
                onSort={toggleSort}
                align="right"
                colId="moq"
                columns={columns}
                dragged={dragged}
              >
                MOQ
              </Th>
              <Th
                sortKey="prod"
                search={search}
                onSort={toggleSort}
                align="right"
                colId="production"
                columns={columns}
                dragged={dragged}
              >
                Production
              </Th>
              <Th colId="status" columns={columns} dragged={dragged}>
                Status
              </Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {products.isLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b border-border">
                    <td colSpan={11} className="p-2">
                      <Skeleton className="h-7 rounded-md" />
                    </td>
                  </tr>
                ))
              : pageItems.map((product) => {
                  const isOpen = openIds.includes(product.id);
                  const isEditing = isOpen && editingId === product.id;
                  const cover = productImage(product);
                  const sourcing = rowSourcing(product);
                  const supplier = sourcing?.suppliers ?? null;
                  const rail = isOpen
                    ? "bg-navy-50 [&>td:first-child]:border-l-2 [&>td:first-child]:border-l-lime-500"
                    : "hover:bg-secondary/50";
                  return (
                    <Fragment key={product.id}>
                      <tr
                        className={`h-[41px] cursor-pointer border-b border-border ${rail}`}
                        onClick={() => {
                          setOpenIds((prev) =>
                            prev.includes(product.id)
                              ? prev.filter((id) => id !== product.id)
                              : [...prev, product.id],
                          );
                          setEditingId(null);
                        }}
                      >
                        <Td>
                          {cover ? (
                            <img
                              src={cover}
                              alt={product.name}
                              loading="lazy"
                              className="size-[30px] rounded object-cover"
                            />
                          ) : (
                            <ProductPlaceholder className="size-[30px] rounded border border-dashed border-border" />
                          )}
                        </Td>
                        <Td truncate title={categoryName.get(product.category_id ?? "") ?? ""}>
                          {categoryName.get(product.category_id ?? "") ?? "—"}
                        </Td>
                        <Td truncate title={subName.get(product.subcategory_id ?? "") ?? ""}>
                          {subName.get(product.subcategory_id ?? "") ?? "—"}
                        </Td>
                        <Td>
                          {supplier ? (
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="shrink-0 rounded bg-navy-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-navy-700">
                                {supplier.code}
                              </span>
                              <span className="truncate" title={supplier.name}>
                                {supplier.name}
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-600">Unassigned</span>
                          )}
                        </Td>
                        <Td truncate title={product.name}>
                          <span className="font-medium">{product.name}</span>
                        </Td>
                        <Td>
                          <span className="flex items-center gap-1.5 font-mono text-[12px]">
                            <SourceDot source={product.inventory_source} />
                            {product.sku ?? "—"}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {sourcing?.supplier_item_no || "—"}
                          </span>
                        </Td>
                        <Td align="right">{product.moq ?? "—"}</Td>
                        <Td align="right">
                          {product.production_min_days == null
                            ? "—"
                            : product.production_max_days &&
                                product.production_max_days !== product.production_min_days
                              ? `${product.production_min_days}–${product.production_max_days} d`
                              : `${product.production_min_days} d`}
                        </Td>
                        <Td>
                          <span className="flex items-center gap-1.5">
                            <span
                              aria-hidden
                              className={`size-2 shrink-0 rounded-full ${
                                product.is_active ? "bg-lime-500" : "bg-n-400"
                              }`}
                            />
                            {product.is_active ? "Active" : "Hidden"}
                            {product.is_featured ? (
                              <Star className="size-3 fill-lime-500 text-lime-500" />
                            ) : null}
                          </span>
                        </Td>
                        <Td align="right">
                          <ChevronDown
                            className={`size-4 text-muted-foreground transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </Td>
                      </tr>
                      {isOpen ? (
                        <tr
                          className="border-b border-border bg-navy-50 [&>td:first-child]:border-l-2 [&>td:first-child]:border-l-lime-500"
                        >
                          <td colSpan={11} className="p-4">
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
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
        {!products.isLoading && pageItems.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No products match these filters.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span>{rows.length} products</span>
          <span>{activeCount} active</span>
          <span>{noPhotoCount} without photos</span>
          <span>{supplierCounts.unassigned} supplier unassigned</span>
          {!columns.isDefault ? (
            <button
              type="button"
              onClick={columns.resetAll}
              className="ml-auto underline underline-offset-2 hover:text-foreground"
            >
              Reset widths
            </button>
          ) : null}
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() =>
              void navigate({ search: (prev: ProductSearch) => ({ ...prev, page: page - 1 }) })
            }
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() =>
              void navigate({ search: (prev: ProductSearch) => ({ ...prev, page: page + 1 }) })
            }
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

/** Dense header cell; sortable when a sortKey is supplied. */
function Th({
  children,
  className = "",
  align = "left",
  sortKey,
  search,
  onSort,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  sortKey?: SortKey;
  search?: ProductSearch;
  onSort?: (key: SortKey) => void;
}) {
  const active = sortKey && search?.sort === sortKey;
  return (
    <th
      className={`px-2 py-2 text-[11px] font-semibold text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {sortKey && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 hover:text-foreground ${
            active ? "text-foreground" : ""
          }`}
        >
          {children}
          {active ? (
            search?.dir === "desc" ? (
              <ArrowDown className="size-3" />
            ) : (
              <ArrowUp className="size-3" />
            )
          ) : null}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function Td({
  children,
  className = "",
  align = "left",
  truncate = false,
  title,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right";
  truncate?: boolean;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={`px-2 py-1 align-middle ${align === "right" ? "text-right" : ""} ${
        truncate ? "max-w-0 truncate" : ""
      } ${className}`}
    >
      {truncate ? <span className="block truncate">{children}</span> : children}
    </td>
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
  product: AdminProductRow;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const shipping = useShippingSettings();
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
        <Spec
          label="Production time"
          value={productionLabel(product.production_min_days, product.production_max_days)}
        />
        <Spec label="Air lead time" value={airLeadLabel(product, shipping) ?? "On request"} />
        <Spec label="Sea lead time" value={seaLeadLabel(product, shipping) ?? "On request"} />
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
