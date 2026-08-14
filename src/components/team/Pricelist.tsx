/**
 * /team Pricelist: one wide ERP-style sheet row per product, grouped by SKU
 * family. Five content columns — Image, Product, Product Details, Packing &
 * Production, Pricing — plus a right-hand spacer track so the pricing strip
 * sizes to its widest price table instead of stretching. Everything here is
 * staff-only (the route is gated) and every write goes through the same
 * staff-gated products / product_sourcing paths the admin editors use.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, ExternalLink, Image as ImageIcon, Link2, MoreVertical, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImageManager } from "@/components/admin/ImageManager";
import { AddAttributePopover } from "@/components/team/AddAttributePopover";
import { DecorationPricing } from "@/components/team/DecorationPricing";
import { InlineChoice, InlineField } from "@/components/team/inline-field";
import { UnitSwitch } from "@/components/team/PackingUnits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IncludedItems } from "@/components/team/IncludedItems";
import { costingReadyMissing, type MissingField } from "@/lib/costing-gate";
import { buildPricelistItems, memberDisplayName } from "@/lib/pricelist-groups";
import {
  productIncludesQuery,
  type ProductInclude,
} from "@/lib/product-includes";
import {
  imageSrc,
  productionLabel,
  type Category,
  type Product,
  type Subcategory,
} from "@/lib/catalog";
import { appSettingsQuery } from "@/lib/costing";
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
  duplicateProduct,
  duplicateProductAsVariant,
  numOrNull,
  numberText,
  positiveProblem,
  relativeTime,
  updateProductFields,
  weightLabel,
} from "@/lib/pricelist";
import { moqProblem, nameProblem } from "@/lib/product-rules";
import {
  deleteProductDetail,
  detailLabelsQuery,
  productDetailsQuery,
  updateProductDetailValue,
  type DetailLabel,
  type ProductDetailRow,
} from "@/lib/product-details";
import {
  originsQuery,
  saveSourcingPatch,
  sourcingRowsQuery,
  suppliersQuery,
  type Origin,
  type SourcingRow,
  type Supplier,
} from "@/lib/sourcing";
import {
  cartonCbm,
  constantsFrom,
  convertLength,
  convertWeight,
  effectiveUnits,
  type Constants,
  type DimensionUnit,
  type WeightUnit,
} from "@/lib/units";

/** Single source of truth for the sheet's column layout (header + every row). */
const COLS =
  "grid grid-cols-[296px_260px_200px_290px_max-content_1fr] gap-8 px-[18px]";

const DASH = <span className="text-muted-foreground">—</span>;

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
  const origins = useQuery(originsQuery);
  const sourcing = useQuery(sourcingRowsQuery);
  const methods = useQuery(decorationMethodsQuery);
  const details = useQuery(methodDetailsQuery);
  const decorations = useQuery(productDecorationsQuery);
  const attributeLabels = useQuery(detailLabelsQuery);
  const attributes = useQuery(productDetailsQuery);
  const includes = useQuery(productIncludesQuery);
  const settings = useQuery(appSettingsQuery);
  const constants = constantsFrom(settings.data);
  const [focusVariantFor, setFocusVariantFor] = useState<string | null>(null);

  const sourcingByProduct = new Map(
    (sourcing.data ?? []).map((row) => [row.product_id, row] as const),
  );
  const attributesByProduct = new Map<string, ProductDetailRow[]>();
  for (const row of attributes.data ?? []) {
    const list = attributesByProduct.get(row.product_id) ?? [];
    list.push(row);
    attributesByProduct.set(row.product_id, list);
  }
  const decorationsByProduct = new Map<string, ProductDecoration[]>();
  for (const row of decorations.data ?? []) {
    const list = decorationsByProduct.get(row.product_id) ?? [];
    list.push(row);
    decorationsByProduct.set(row.product_id, list);
  }
  const includesByProduct = new Map<string, ProductInclude[]>();
  for (const row of includes.data ?? []) {
    const list = includesByProduct.get(row.product_id) ?? [];
    list.push(row);
    includesByProduct.set(row.product_id, list);
  }

  /**
   * GROUPING — pure name-based (normalized name + supplier), computed at render.
   * No stored link: renaming a product joins/leaves its family immediately.
   */
  const items = buildPricelistItems(products, sourcingByProduct);

  const renderRow = (product: Product) => (
    <PricelistRow
      key={product.id}
      product={product}
      categories={categories}
      subcategories={subcategories}
      sourcing={sourcingByProduct.get(product.id) ?? null}
      suppliers={suppliers.data ?? []}
      origins={origins.data ?? []}
      decorations={decorationsByProduct.get(product.id) ?? []}
      methods={methods.data ?? []}
      details={details.data ?? []}
      attributeLabels={attributeLabels.data ?? []}
      attributes={attributesByProduct.get(product.id) ?? []}
      includes={includesByProduct.get(product.id) ?? []}
      constants={constants}
      focusVariant={focusVariantFor === product.id}
      onDuplicated={setFocusVariantFor}
    />
  );

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[1440px]">
        <div
          className={`${COLS} sticky top-0 z-10 items-end border-b border-navy-200 bg-card/95 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur`}
        >
          <span>Image</span>
          <span>Product</span>
          <span>Product Details</span>
          <span>Packing &amp; Production</span>
          <span>Pricing</span>
          <span aria-hidden />
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {items.map((item) =>
            item.type === "group" ? (
              <div
                key={`${item.supplierId ?? "none"}-${item.parentName}`}
                className="rounded-xl border border-navy-200 bg-card/60"
              >
                <div className="flex items-center justify-between gap-2 border-b border-navy-100 px-[18px] py-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-navy-700">
                    <Link2 className="size-3.5 text-navy-500" />
                    {item.parentName}
                    <span className="font-normal text-muted-foreground">
                      · {item.members.length} variants
                    </span>
                  </p>
                  <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-700">
                    Grouped
                  </span>
                </div>
                <div className="flex flex-col divide-y divide-navy-100">
                  {item.members.map(renderRow)}
                </div>
              </div>
            ) : (
              <div key={item.product.id} className="rounded-xl border border-navy-100 bg-card/60">
                {renderRow(item.product)}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function Kv({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-baseline gap-x-3">
      <span className="text-[11px] uppercase leading-snug tracking-[0.04em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-[13px] leading-snug text-navy-700">{children}</span>
    </div>
  );
}

/**
 * Costing-gate badge. The missing-field list comes from the ONE shared gate
 * (src/lib/costing-gate.ts) the /team filter — and later the pricing engine —
 * also use. It says nothing about customer visibility.
 */
function CostingBadge({ missing }: { missing: MissingField[] }) {
  if (!missing.length) {
    return (
      <span className="w-fit rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-700">
        Costing ready
      </span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="w-fit cursor-help rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-600">
          Incomplete · {missing.length} missing
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px] text-left">
        <p className="font-semibold">Missing for costing</p>
        <ul className="mt-1 list-inside list-disc">
          {missing.map((field) => (
            <li key={field.key}>{field.label}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function PricelistRow({
  product,
  categories,
  subcategories,
  sourcing,
  suppliers,
  origins,
  decorations,
  methods,
  details,
  attributeLabels,
  attributes,
  includes,
  constants,
  focusVariant,
  onDuplicated,
}: {
  product: Product;
  categories: Category[];
  subcategories: Subcategory[];
  sourcing: SourcingRow | null;
  suppliers: Supplier[];
  origins: Origin[];
  decorations: ProductDecoration[];
  methods: DecorationMethod[];
  details: MethodDetail[];
  attributeLabels: DetailLabel[];
  attributes: ProductDetailRow[];
  includes: ProductInclude[];
  constants: Constants;
  focusVariant: boolean;
  onDuplicated: (productId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [imagesOpen, setImagesOpen] = useState(false);
  const supplier = suppliers.find((row) => row.id === sourcing?.supplier_id) ?? null;
  const units = effectiveUnits(sourcing, supplier?.unit_system);
  /** CBM is always normalized from the effective dimension unit, never assumed metric. */
  const cbm = cartonCbm(
    sourcing?.carton_length ?? null,
    sourcing?.carton_width ?? null,
    sourcing?.carton_height ?? null,
    units.dimension,
    constants,
  );
  const origin = origins.find((row) => row.id === supplier?.origin_id) ?? null;
  const images = product.images ?? [];

  const refreshProducts = () => queryClient.invalidateQueries({ queryKey: ["products"] });
  const refreshSourcing = () => queryClient.invalidateQueries({ queryKey: ["product_sourcing"] });
  const refreshAttributes = () =>
    queryClient.invalidateQueries({ queryKey: ["product_details"] });
  const refreshIncludes = () => queryClient.invalidateQueries({ queryKey: ["product_includes"] });
  const missing = costingReadyMissing(product, sourcing);
  const labelName = (id: string) =>
    attributeLabels.find((row) => row.id === id)?.label ?? "Attribute";
  const usedLabelIds = new Set(attributes.map((row) => row.detail_label_id));
  const nextAttributeSort =
    attributes.reduce((max, row) => Math.max(max, row.sort_order), 0) + 10;

  const saveProduct = async (patch: Record<string, unknown>) => {
    await updateProductFields(product.id, patch);
    await refreshProducts();
  };
  const savePacking = async (patch: Parameters<typeof saveSourcingPatch>[1]) => {
    await saveSourcingPatch(product.id, patch);
    await refreshSourcing();
  };

  const subOptions = subcategories
    .filter((row) => row.category_id === product.category_id)
    .map((row) => ({ value: row.id, label: row.name }));

  return (
    <div className={`${COLS} items-start py-3.5`}>
      {/* Image */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <ImageSlot
            label="Product Image"
            path={images[0]}
            onOpen={() => setImagesOpen(true)}
          />
          <ImageSlot label="Reference" path={images[1]} onOpen={() => setImagesOpen(true)} />
        </div>
        <button
          type="button"
          onClick={() => setImagesOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-navy-200 px-2.5 py-1 text-[11px] font-semibold text-navy-700 hover:bg-navy-50"
        >
          <Upload className="size-3" /> Upload
        </button>
        <p className="text-[11px] text-muted-foreground">
          Updated {relativeTime(product.updated_at)}
        </p>
      </div>

      {/* Product */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-1">
          <InlineField
            className="flex-1"
            value={product.name}
            display={
              <span className="text-[13px] font-semibold text-navy-700">
                {memberDisplayName(product, sourcing)}
              </span>
            }
            validate={nameProblem}
            save={(raw) => saveProduct({ name: raw.trim() })}
          />
          <RowKebab product={product} saveProduct={saveProduct} onDuplicated={onDuplicated} />
        </div>

        <InlineField
          value={sourcing?.variant_label ?? ""}
          placeholder="Variant"
          autoEdit={focusVariant}
          display={
            <span className="w-fit rounded-full bg-navy-100 px-2 py-0.5 text-[11px] font-medium text-navy-700">
              {sourcing?.variant_label || "Add variant"}
            </span>
          }
          save={(raw) => savePacking({ variant_label: raw.trim() || null })}
        />

        {!product.is_active ? (
          <span className="w-fit rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-navy-600">
            Hidden
          </span>
        ) : null}

        <CostingBadge missing={missing} />

        <div className="mt-0.5 flex flex-col gap-1">
          <Kv label="Supplier">
            <InlineChoice
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
          </Kv>
          <Kv label="Supplier item number">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 rounded bg-navy-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-navy-700">
                {supplier?.code ?? "—"}
              </span>
              <InlineField
                className="min-w-0 flex-1"
                value={sourcing?.supplier_item_no ?? ""}
                save={(raw) => savePacking({ supplier_item_no: raw.trim() || null })}
              />
            </span>
          </Kv>
          <Kv label="Supplier item name">
            <InlineField
              value={sourcing?.supplier_item_name ?? ""}
              save={(raw) => savePacking({ supplier_item_name: raw.trim() || null })}
            />
          </Kv>
          <Kv label="Origin">{origin?.name ?? DASH}</Kv>
          <Kv label="Category">
            <InlineChoice
              value={product.category_id ?? ""}
              options={[
                { value: "", label: "—" },
                ...categories.map((row) => ({ value: row.id, label: row.name })),
              ]}
              save={(next) => saveProduct({ category_id: next || null })}
            />
          </Kv>
          <Kv label="Subcategory">
            {subOptions.length === 0 ? (
              DASH
            ) : (
              <InlineChoice
                value={product.subcategory_id ?? ""}
                options={subOptions}
                save={(next) => saveProduct({ subcategory_id: next })}
              />
            )}
          </Kv>
          <Kv label="SKU">
            <span className="font-mono text-xs text-muted-foreground">{product.sku ?? "—"}</span>
          </Kv>
        </div>
      </div>

      {/* Product details */}
      <div className="flex min-w-0 flex-col gap-1">
        <Kv label="Material">
          <InlineField
            value={product.material ?? ""}
            save={(raw) => saveProduct({ material: raw.trim() || null })}
          />
        </Kv>
        <Kv label="Size">
          <InlineField
            value={product.size ?? ""}
            save={(raw) => saveProduct({ size: raw.trim() || null })}
          />
        </Kv>
        {attributes.map((row) => (
          <div key={row.id} className="group flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <Kv label={labelName(row.detail_label_id)}>
                <InlineField
                  value={row.value}
                  save={async (raw) => {
                    await updateProductDetailValue(row.id, raw);
                    await refreshAttributes();
                  }}
                />
              </Kv>
            </div>
            <button
              type="button"
              title={`Remove ${labelName(row.detail_label_id)}`}
              onClick={async () => {
                try {
                  await deleteProductDetail(row.id);
                  await refreshAttributes();
                } catch (problem) {
                  toast.error(
                    problem instanceof Error ? problem.message : "Could not remove attribute",
                  );
                }
              }}
              className="mt-1 text-[11px] font-semibold text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        <AddAttributePopover
          productId={product.id}
          labels={attributeLabels}
          usedLabelIds={usedLabelIds}
          nextSortOrder={nextAttributeSort}
          onAdded={refreshAttributes}
        />
        <IncludedItems productId={product.id} rows={includes} onChanged={refreshIncludes} />
      </div>

      {/* Packing & production */}
      <div className="flex min-w-0 flex-col gap-1">
        <Kv label="Pcs / ctn">
          <InlineField
            value={numberText(sourcing?.carton_pack)}
            numeric
            validate={positiveProblem}
            save={(raw) => savePacking({ carton_pack: numOrNull(raw) })}
          />
        </Kv>
        <Kv
          label={
            <span className="inline-flex items-center gap-1">
              L × W × H
              <UnitSwitch
                options={["cm", "in"] as const}
                value={units.dimension}
                auto={units.dimensionAuto}
                ariaLabel={`Dimension unit for ${product.name}`}
                unitColumn="dimension_unit"
                fields={[
                  { key: "carton_length", label: "Length", value: sourcing?.carton_length ?? null },
                  { key: "carton_width", label: "Width", value: sourcing?.carton_width ?? null },
                  { key: "carton_height", label: "Height", value: sourcing?.carton_height ?? null },
                ]}
                convert={(value, from, to) =>
                  convertLength(value, from as DimensionUnit, to as DimensionUnit, constants)
                }
                onApply={(patch) => savePacking(patch as never)}
              />
            </span>
          }
        >
          <span className="flex flex-nowrap items-center gap-1">
            <InlineField
              className="w-11 shrink-0"
              value={numberText(sourcing?.carton_length)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_length: numOrNull(raw) })}
            />
            <InlineField
              className="w-11 shrink-0"
              value={numberText(sourcing?.carton_width)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_width: numOrNull(raw) })}
            />
            <InlineField
              className="w-11 shrink-0"
              value={numberText(sourcing?.carton_height)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_height: numOrNull(raw) })}
            />
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {cartonDims(
              sourcing?.carton_length ?? null,
              sourcing?.carton_width ?? null,
              sourcing?.carton_height ?? null,
              units.dimension,
            )}
            {cbm != null ? ` · ${cbm} CBM` : ""}
          </span>
        </Kv>
        <Kv
          label={
            <span className="inline-flex items-center gap-1">
              Weight
              <UnitSwitch
                options={["kg", "lb"] as const}
                value={units.weight}
                auto={units.weightAuto}
                ariaLabel={`Weight unit for ${product.name}`}
                unitColumn="weight_unit"
                fields={[
                  { key: "carton_weight", label: "Weight", value: sourcing?.carton_weight ?? null },
                ]}
                convert={(value, from, to) =>
                  convertWeight(value, from as WeightUnit, to as WeightUnit, constants)
                }
                onApply={(patch) => savePacking(patch as never)}
              />
            </span>
          }
        >
          <InlineField
            value={numberText(sourcing?.carton_weight)}
            display={weightLabel(sourcing?.carton_weight ?? null, units.weight)}
            numeric
            validate={positiveProblem}
            save={(raw) => savePacking({ carton_weight: numOrNull(raw) })}
          />
        </Kv>
        <Kv label="Lead time (days)">
          <span className="flex flex-nowrap items-center gap-1">
            <InlineField
              className="w-10 shrink-0"
              value={product.production_min_days == null ? "" : String(product.production_min_days)}
              numeric
              save={(raw) => saveProduct({ production_min_days: numOrNull(raw) })}
            />
            <span className="text-muted-foreground">–</span>
            <InlineField
              className="w-10 shrink-0"
              value={product.production_max_days == null ? "" : String(product.production_max_days)}
              numeric
              save={(raw) => saveProduct({ production_max_days: numOrNull(raw) })}
            />
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {productionLabel(product.production_min_days, product.production_max_days)}
          </span>
        </Kv>
        <Kv label="MOQ">
          <InlineField
            value={product.moq == null ? "" : String(product.moq)}
            numeric
            validate={moqProblem}
            save={(raw) => saveProduct({ moq: numOrNull(raw) })}
          />
        </Kv>
      </div>

      {/* Pricing */}
      <DecorationPricing
        productId={product.id}
        decorations={decorations}
        methods={methods}
        details={details}
      />

      <span aria-hidden />

      <Sheet open={imagesOpen} onOpenChange={setImagesOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{product.name} — images</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ImageManager
              images={images}
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

function ImageSlot({
  label,
  path,
  onOpen,
}: {
  label: string;
  path: string | undefined;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} — manage images`}
      className="group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-navy-100 bg-navy-50"
    >
      {path ? (
        <img src={imageSrc(path)} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-muted-foreground">
          <ImageIcon className="size-5" />
          <span className="text-[10px] font-medium uppercase tracking-wide">No image</span>
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-n-900/70 py-0.5 text-center text-[10px] font-semibold uppercase text-white opacity-0 transition group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function RowKebab({
  product,
  saveProduct,
  onDuplicated,
}: {
  product: Product;
  saveProduct: (patch: Record<string, unknown>) => Promise<void>;
  onDuplicated: (productId: string) => void;
}) {
  const queryClient = useQueryClient();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Row actions"
        className="text-muted-foreground hover:text-navy-700"
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60]">
        <DropdownMenuItem asChild>
          <Link to="/admin/products" search={{ q: product.sku ?? product.name }}>
            <ExternalLink className="mr-2 size-3.5" /> Open in editor
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void duplicateProduct(product.id).then(
              async () => {
                await queryClient.invalidateQueries({ queryKey: ["products"] });
                toast.success("Duplicated as a hidden variant");
              },
              (error: unknown) =>
                toast.error(error instanceof Error ? error.message : "Could not duplicate"),
            );
          }}
        >
          <Copy className="mr-2 size-3.5" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void duplicateProductAsVariant(product.id).then(
              async (newId) => {
                await queryClient.invalidateQueries();
                onDuplicated(newId);
                toast.success("Variant created — hidden until reviewed");
              },
              (error: unknown) =>
                toast.error(error instanceof Error ? error.message : "Could not duplicate"),
            );
          }}
        >
          <Copy className="mr-2 size-3.5" /> Duplicate as variant
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
          {product.is_active ? "Hide" : "Show"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
