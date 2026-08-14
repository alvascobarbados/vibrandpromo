/**
 * /team Pricelist: one wide ERP-style row per product, grouped by SKU family.
 * Five columns — image, product, product details, packing & production, and
 * decoration pricing. Everything here is staff-only (the route is gated) and
 * every write goes through the same staff-gated product / product_sourcing
 * paths the admin editors use.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Image as ImageIcon, MoreVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImageManager } from "@/components/admin/ImageManager";
import { DecorationPricing } from "@/components/team/DecorationPricing";
import { InlineChoice, InlineField } from "@/components/team/inline-field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  COLOUR_OPTIONS,
  productImage,
  productionLabel,
  type Category,
  type Product,
  type Subcategory,
} from "@/lib/catalog";
import {
  decorationMethodsQuery,
  methodDetailsQuery,
  productDecorationsQuery,
  type DecorationMethod,
  type MethodDetail,
  type ProductDecoration,
} from "@/lib/decorations";
import {
  cartonDims,
  numOrNull,
  numberText,
  positiveProblem,
  skuFamily,
  updateProductFields,
  weightLabel,
} from "@/lib/pricelist";
import { moqProblem, nameProblem } from "@/lib/product-rules";
import {
  saveSourcingPatch,
  sourcingRowsQuery,
  suppliersQuery,
  type SourcingRow,
  type Supplier,
} from "@/lib/sourcing";

const COLS = "grid grid-cols-[110px_minmax(200px,1fr)_minmax(170px,220px)_minmax(180px,230px)_minmax(260px,1.4fr)] gap-3";

export function Pricelist({
  products,
  categories,
  subcategories,
}: {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
}) {
  const suppliers = useQuery(suppliersQuery);
  const sourcing = useQuery(sourcingRowsQuery);
  const methods = useQuery(decorationMethodsQuery);
  const details = useQuery(methodDetailsQuery);
  const decorations = useQuery(productDecorationsQuery);

  const sourcingByProduct = new Map(
    (sourcing.data ?? []).map((row) => [row.product_id, row] as const),
  );
  const decorationsByProduct = new Map<string, ProductDecoration[]>();
  for (const row of decorations.data ?? []) {
    const list = decorationsByProduct.get(row.product_id) ?? [];
    list.push(row);
    decorationsByProduct.set(row.product_id, list);
  }

  const categoryById = new Map(categories.map((c) => [c.id, c.name] as const));
  const subById = new Map(subcategories.map((s) => [s.id, s.name] as const));

  /** Group by SKU family; single-product families render without a header. */
  const families: Array<{ key: string; items: Product[] }> = [];
  const index = new Map<string, number>();
  for (const product of products) {
    const key = skuFamily(product.sku) || product.id;
    const at = index.get(key);
    if (at == null) {
      index.set(key, families.length);
      families.push({ key, items: [product] });
    } else {
      families[at]?.items.push(product);
    }
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[1180px]">
        <div
          className={`${COLS} sticky top-16 z-10 border-b border-navy-200 bg-card/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur`}
        >
          <span>Image</span>
          <span>Product</span>
          <span>Product details</span>
          <span>Packing &amp; production</span>
          <span>Decoration pricing</span>
        </div>

        <div className="flex flex-col">
          {families.map((family) => (
            <div key={family.key}>
              {family.items.length > 1 ? (
                <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-navy-500">
                  {family.key} · {family.items.length} variants
                </p>
              ) : null}
              {family.items.map((product) => (
                <PricelistRow
                  key={product.id}
                  product={product}
                  categoryName={categoryById.get(product.category_id ?? "") ?? "—"}
                  subcategoryName={subById.get(product.subcategory_id ?? "") ?? "—"}
                  sourcing={sourcingByProduct.get(product.id) ?? null}
                  suppliers={suppliers.data ?? []}
                  decorations={decorationsByProduct.get(product.id) ?? []}
                  methods={methods.data ?? []}
                  details={details.data ?? []}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PricelistRow({
  product,
  categoryName,
  subcategoryName,
  sourcing,
  suppliers,
  decorations,
  methods,
  details,
}: {
  product: Product;
  categoryName: string;
  subcategoryName: string;
  sourcing: SourcingRow | null;
  suppliers: Supplier[];
  decorations: ProductDecoration[];
  methods: DecorationMethod[];
  details: MethodDetail[];
}) {
  const queryClient = useQueryClient();
  const [imagesOpen, setImagesOpen] = useState(false);
  const supplier = suppliers.find((row) => row.id === sourcing?.supplier_id) ?? null;
  const metric = (supplier?.unit_system ?? "metric") === "metric";
  const cover = productImage(product);

  const refreshProducts = () => queryClient.invalidateQueries({ queryKey: ["products"] });
  const refreshSourcing = () => queryClient.invalidateQueries({ queryKey: ["product_sourcing"] });

  const saveProduct = async (patch: Record<string, unknown>) => {
    await updateProductFields(product.id, patch);
    await refreshProducts();
  };
  const savePacking = async (patch: Parameters<typeof saveSourcingPatch>[1]) => {
    await saveSourcingPatch(product.id, patch);
    await refreshSourcing();
  };

  return (
    <div className={`${COLS} items-start border-b border-navy-100 px-3 py-3`}>
      {/* Image */}
      <div>
        <button
          type="button"
          onClick={() => setImagesOpen(true)}
          className="group relative block size-[96px] overflow-hidden rounded-lg border border-navy-100 bg-navy-50"
          aria-label="Manage images"
        >
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-5" />
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-n-900/70 py-0.5 text-center text-[10px] font-semibold uppercase text-white opacity-0 transition group-hover:opacity-100">
            {product.images?.length ? `${product.images.length} photos` : "Add photo"}
          </span>
        </button>
      </div>

      {/* Product */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-start justify-between gap-1">
          <InlineField
            className="flex-1"
            value={product.name}
            display={<span className="font-semibold text-navy-700">{product.name}</span>}
            validate={nameProblem}
            save={(raw) => saveProduct({ name: raw.trim() })}
          />
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Row actions" className="text-muted-foreground hover:text-navy-700">
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/admin/products" search={{ q: product.sku ?? product.name }}>
                  <ExternalLink className="mr-2 size-3.5" /> Open in editor
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  void saveProduct({ is_active: !product.is_active }).then(
                    () => toast.success(product.is_active ? "Hidden from catalogue" : "Published"),
                    (error: unknown) =>
                      toast.error(error instanceof Error ? error.message : "Could not save"),
                  );
                }}
              >
                {product.is_active ? "Hide from catalogue" : "Publish"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{product.sku ?? "—"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {categoryName} · {subcategoryName}
        </p>
        <InlineChoice
          label="Supplier"
          value={sourcing?.supplier_id ?? ""}
          options={[
            { value: "", label: "Unassigned" },
            ...[...suppliers]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((row) => ({ value: row.id, label: row.name })),
          ]}
          display={
            supplier ? (
              supplier.name
            ) : (
              <span className="font-medium text-amber-600">Unassigned</span>
            )
          }
          save={(next) => savePacking({ supplier_id: next || null })}
        />
        <InlineField
          label="Supplier item #"
          value={sourcing?.supplier_item_no ?? ""}
          save={(raw) => savePacking({ supplier_item_no: raw.trim() || null })}
        />
        <InlineField
          label="Supplier item name"
          value={sourcing?.supplier_item_name ?? ""}
          save={(raw) => savePacking({ supplier_item_name: raw.trim() || null })}
        />
        <InlineField
          label="Variant"
          value={sourcing?.variant_label ?? ""}
          save={(raw) => savePacking({ variant_label: raw.trim() || null })}
        />
        {!product.is_active ? (
          <span className="w-fit rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-navy-600">
            Hidden
          </span>
        ) : null}
      </div>

      {/* Product details */}
      <div className="flex min-w-0 flex-col gap-1">
        <InlineField
          label="Material"
          value={product.material ?? ""}
          save={(raw) => saveProduct({ material: raw.trim() || null })}
        />
        <InlineField
          label="Size"
          value={product.size ?? ""}
          save={(raw) => saveProduct({ size: raw.trim() || null })}
        />
        <InlineField
          label="Capacity"
          value={product.capacity ?? ""}
          save={(raw) => saveProduct({ capacity: raw.trim() || null })}
        />
        <InlineField
          label="Item weight"
          value={product.weight ?? ""}
          save={(raw) => saveProduct({ weight: raw.trim() || null })}
        />
        <InlineChoice
          label="Colour options"
          value={product.colour_option ?? ""}
          options={[
            { value: "", label: "—" },
            ...COLOUR_OPTIONS.map((option) => ({ value: option, label: option })),
          ]}
          save={(next) => saveProduct({ colour_option: next || null })}
        />
      </div>

      {/* Packing & production */}
      <div className="flex min-w-0 flex-col gap-1">
        <InlineField
          label="MOQ"
          value={product.moq == null ? "" : String(product.moq)}
          numeric
          validate={moqProblem}
          save={(raw) => saveProduct({ moq: numOrNull(raw) })}
        />
        <InlineField
          label="Carton pack"
          value={numberText(sourcing?.carton_pack)}
          numeric
          validate={positiveProblem}
          save={(raw) => savePacking({ carton_pack: numOrNull(raw) })}
        />
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Carton L × W × H ({metric ? "cm" : "in"})
          </span>
          <div className="flex items-center gap-1">
            <InlineField
              value={numberText(sourcing?.carton_length)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_length: numOrNull(raw) })}
            />
            <InlineField
              value={numberText(sourcing?.carton_width)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_width: numOrNull(raw) })}
            />
            <InlineField
              value={numberText(sourcing?.carton_height)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_height: numOrNull(raw) })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {cartonDims(
              sourcing?.carton_length ?? null,
              sourcing?.carton_width ?? null,
              sourcing?.carton_height ?? null,
              metric,
            )}
          </p>
        </div>
        <InlineField
          label={`Carton weight (${metric ? "kg" : "lb"})`}
          value={numberText(sourcing?.carton_weight)}
          display={weightLabel(sourcing?.carton_weight ?? null, metric)}
          numeric
          validate={positiveProblem}
          save={(raw) => savePacking({ carton_weight: numOrNull(raw) })}
        />
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Production (days)
          </span>
          <div className="flex items-center gap-1">
            <InlineField
              value={product.production_min_days == null ? "" : String(product.production_min_days)}
              numeric
              save={(raw) => saveProduct({ production_min_days: numOrNull(raw) })}
            />
            <InlineField
              value={product.production_max_days == null ? "" : String(product.production_max_days)}
              numeric
              save={(raw) => saveProduct({ production_max_days: numOrNull(raw) })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {productionLabel(product.production_min_days, product.production_max_days)}
          </p>
        </div>
      </div>

      {/* Decoration pricing */}
      <DecorationPricing
        productId={product.id}
        decorations={decorations}
        methods={methods}
        details={details}
      />

      <Sheet open={imagesOpen} onOpenChange={setImagesOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{product.name} — images</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ImageManager
              images={product.images ?? []}
              inputId={`pricelist-image-${product.id}`}
              onChange={(next) => {
                void saveProduct({ images: next }).catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Could not save images"),
                );
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}