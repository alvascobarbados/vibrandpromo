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
import {
  ChevronDown,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  MoreVertical,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImageManager } from "@/components/admin/ImageManager";
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
import { AddAttributePopover } from "@/components/team/AddAttributePopover";
import { DecorationPricing } from "@/components/team/DecorationPricing";
import { InlineChoice, InlineField } from "@/components/team/inline-field";
import { RangeRow } from "@/components/team/range-row";
import { UnitSwitch } from "@/components/team/PackingUnits";
import { ProductionExtras } from "@/components/team/ProductionExtras";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IncludedItems } from "@/components/team/IncludedItems";
import { costingReadyMissing, type MissingField } from "@/lib/costing-gate";
import { liveGateProblem } from "@/lib/live-gate";
import { buildPricelistItems, memberDisplayName } from "@/lib/pricelist-groups";
import { productIncludesQuery, type ProductInclude } from "@/lib/product-includes";
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
  duplicateProduct,
  duplicateProductAsVariant,
  numOrNull,
  numberText,
  positiveProblem,
  relativeTime,
  updateProductFields,
  weight3,
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
  constantsFrom,
  convertLength,
  convertWeight,
  effectiveUnits,
  type Constants,
  type DimensionUnit,
  type WeightUnit,
} from "@/lib/units";

/**
 * Single source of truth for the sheet's column layout (header + every row).
 * Identity / details / packing keep fixed comfortable widths; the pricing strip
 * takes ALL remaining width so wide monitors show more price tables before the
 * strip's own sideways scroll starts.
 */
const COLS =
  "grid grid-cols-[120px_190px_196px_260px_268px_minmax(0,1fr)] gap-3 px-4";

/** ONE vertical rhythm token — matched to the decoration pricing QTY rows. */
const ROW = "min-h-[22px]";
/** Shared label gutter so all four data columns align on one vertical line. */
const GUTTER = "grid grid-cols-[88px_minmax(0,1fr)] gap-x-3";

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
      <div className="min-w-[1420px]">
        <div
          className={`${COLS} sticky top-0 z-10 items-end border-b border-navy-200 bg-card/95 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground backdrop-blur`}
        >
          <span>Image</span>
          <span>Identity</span>
          <span>Sourcing</span>
          <span>Product Details</span>
          <span>Packing &amp; Production</span>
          <span>Pricing</span>
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

/**
 * Labelled row. `alert` marks a field the costing gate is still waiting on —
 * a small amber dot beside the label, gone the moment it is filled.
 */
function Kv({
  label,
  children,
  alert,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={`${GUTTER} ${ROW} items-baseline`}>
      <span className="flex min-w-0 items-baseline gap-1 text-[11px] uppercase leading-5 tracking-[0.04em] text-muted-foreground">
        <span className="truncate whitespace-nowrap">{label}</span>
        {alert ? <MissingDot /> : null}
      </span>
      <span className="min-w-0 text-[14px] leading-5 text-navy-700">{children}</span>
    </div>
  );
}

/** Costing-gate marker. Purely informational — it blocks nothing. */
function MissingDot() {
  return (
    <span
      title="Needed for costing"
      aria-label="Needed for costing"
      className="size-1.5 shrink-0 self-center rounded-full bg-amber-500"
    />
  );
}

/** Small muted section header inside the packing / production column. */
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p
      className={`${ROW} flex items-center text-[11px] font-semibold uppercase leading-5 tracking-[0.06em] text-muted-foreground`}
    >
      {children}
    </p>
  );
}

/**
 * STATUS chips only — one geometry for every state. Actions are never chips.
 */
function StatusChip({
  tone,
  title,
  children,
}: {
  tone: "ready" | "warn" | "hidden";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    ready: "bg-lime-100 text-navy-700",
    warn: "bg-amber-100 text-amber-800",
    hidden: "bg-n-700 text-white",
  } as const;
  return (
    <span
      {...(title ? { title } : {})}
      className={`inline-flex h-[18px] items-center rounded-full px-2 text-[11px] font-semibold leading-none ${tones[tone]} ${
        title ? "cursor-help" : ""
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Costing-gate badge. The missing-field list comes from the ONE shared gate
 * (src/lib/costing-gate.ts) the /team filter — and later the pricing engine —
 * also use. It says nothing about customer visibility.
 */
function CostingBadge({ missing }: { missing: MissingField[] }) {
  if (!missing.length) return <StatusChip tone="ready">Costing ready</StatusChip>;
  return (
    <StatusChip
      tone="warn"
      title={`Missing for costing: ${missing.map((field) => field.label).join(", ")}`}
    >
      Incomplete · {missing.length} missing
    </StatusChip>
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
  const [addingInclude, setAddingInclude] = useState(false);
  const supplier = suppliers.find((row) => row.id === sourcing?.supplier_id) ?? null;
  const units = effectiveUnits(sourcing, supplier?.unit_system);
  const origin = origins.find((row) => row.id === supplier?.origin_id) ?? null;
  /**
   * CBM / chargeable weight are NOT displayed on the card any more — the shared
   * helpers in src/lib/units.ts stay put for the pricing engine.
   */
  const images = product.images ?? [];

  const refreshProducts = () => queryClient.invalidateQueries({ queryKey: ["products"] });
  const refreshSourcing = () => queryClient.invalidateQueries({ queryKey: ["product_sourcing"] });
  const refreshAttributes = () => queryClient.invalidateQueries({ queryKey: ["product_details"] });
  const refreshIncludes = () => queryClient.invalidateQueries({ queryKey: ["product_includes"] });
  const missing = costingReadyMissing(product, sourcing);
  /** Which fields the gate is waiting on — drives the amber dots. */
  const missingKeys = new Set(missing.map((field) => field.key));
  const labelName = (id: string) =>
    attributeLabels.find((row) => row.id === id)?.label ?? "Attribute";
  const usedLabelIds = new Set(attributes.map((row) => row.detail_label_id));
  const nextAttributeSort = attributes.reduce((max, row) => Math.max(max, row.sort_order), 0) + 10;

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
    <div
      className={`${COLS} items-start border-l-2 py-3.5 ${
        product.status === "live" ? "border-transparent" : "border-amber-400"
      }`}
    >
      {/* Image */}
      <div className="flex flex-col gap-1.5">
        <ImageSlot
          label="Product image"
          path={images[0]}
          onOpen={() => setImagesOpen(true)}
        />
        <div className="flex items-center gap-2">
          <ImageSlot
            label="Reference"
            path={images[1]}
            className="size-[68px] shrink-0"
            extra={images.length > 2 ? images.length - 2 : 0}
            onOpen={() => setImagesOpen(true)}
          />
          <button
            type="button"
            onClick={() => setImagesOpen(true)}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-navy-200 px-2.5 py-1 text-[11px] font-semibold text-navy-700 hover:bg-navy-50"
          >
            <Upload className="size-3" /> Upload
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Updated {relativeTime(product.updated_at)}
        </p>
      </div>

      {/* Identity — read-mostly: who this product is, in one compact block. */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1">
              <InlineField
                className="min-w-0 flex-1"
                value={product.name}
                wrap
                display={
                  <span className="line-clamp-3 text-[15px] font-semibold leading-snug text-navy-700">
                    {memberDisplayName(product, sourcing)}
                  </span>
                }
                validate={nameProblem}
                save={(raw) => saveProduct({ name: raw.trim() })}
              />
              {missingKeys.has("name") ? <MissingDot /> : null}
            </span>
            {/* SKU sits with the name so an unnamed row still has identity. */}
            <span className="font-mono text-[11px] leading-4 text-muted-foreground">
              {product.sku ?? "No SKU"}
            </span>
          </div>
          <RowKebab product={product} saveProduct={saveProduct} onDuplicated={onDuplicated} />
        </div>

        {/* STATUS chips — one consistent row, directly under the product name. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusControl product={product} saveProduct={saveProduct} />
          <CostingBadge missing={missing} />
        </div>

        {/* Variant is an ACTION, not a status — quiet link affordance. */}
        <InlineField
          value={sourcing?.variant_label ?? ""}
          placeholder="Variant"
          autoEdit={focusVariant}
          display={
            sourcing?.variant_label ? (
              <span className="text-[13px] text-navy-700">
                <span className="text-muted-foreground">Variant · </span>
                {sourcing.variant_label}
              </span>
            ) : (
              <span className="text-[12px] font-medium text-navy-500 underline decoration-dotted underline-offset-2 hover:text-navy-700">
                + Add variant
              </span>
            )
          }
          save={(raw) => savePacking({ variant_label: raw.trim() || null })}
        />

        {/* System facts as plain text — still the pickers on click. */}
        <div className="mt-0.5 flex flex-col gap-0.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-[12px] leading-5">
            {missingKeys.has("subcategory") ? <MissingDot /> : null}
            <span className="min-w-0 max-w-full">
              <InlineChoice
                value={product.category_id ?? ""}
                wrap
                options={[
                  { value: "", label: "—" },
                  ...categories.map((row) => ({ value: row.id, label: row.name })),
                ]}
                save={(next) => saveProduct({ category_id: next || null })}
              />
            </span>
            <span className="text-muted-foreground">›</span>
            <span className="min-w-0 max-w-full">
              {subOptions.length === 0 ? (
                DASH
              ) : (
                <InlineChoice
                  value={product.subcategory_id ?? ""}
                  wrap
                  options={subOptions}
                  save={(next) => saveProduct({ subcategory_id: next })}
                />
              )}
            </span>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            Origin {origin?.name ?? "—"} · auto
          </p>
        </div>
      </div>

      {/* Sourcing entry — the three fields staff actually type here. */}
      <div className="flex min-w-0 flex-col gap-1">
        <SectionHead>Sourcing</SectionHead>
        <Kv label="Supplier" alert={missingKeys.has("supplier")}>
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
          <Kv label="Item #">
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
          <Kv label="Item name">
            <InlineField
              value={sourcing?.supplier_item_name ?? ""}
              wrap
              save={(raw) => savePacking({ supplier_item_name: raw.trim() || null })}
            />
          </Kv>
      </div>

      {/* Product details */}
      <div className="flex min-w-0 flex-col gap-1">
        <SectionHead>Product details</SectionHead>
        <Kv label="Material">
          <InlineField
            value={product.material ?? ""}
            wrap
            wrapLines={3}
            save={(raw) => saveProduct({ material: raw.trim() || null })}
          />
        </Kv>
        <Kv label="Size">
          <InlineField
            value={product.size ?? ""}
            wrap
            save={(raw) => saveProduct({ size: raw.trim() || null })}
          />
        </Kv>
        {attributes.map((row) => (
          <div key={row.id} className="group flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <Kv label={labelName(row.detail_label_id)}>
                <InlineField
                  value={row.value}
                  wrap
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
        <IncludedItems
          productId={product.id}
          rows={includes}
          onChanged={refreshIncludes}
          adding={addingInclude}
          onAddingChange={setAddingInclude}
          hideTrigger
        />

        {/* One quiet link row owns both "add" affordances for this column. */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
          <AddAttributePopover
            productId={product.id}
            labels={attributeLabels}
            usedLabelIds={usedLabelIds}
            nextSortOrder={nextAttributeSort}
            onAdded={refreshAttributes}
            triggerLabel="+ Attribute"
            triggerClassName="text-navy-500 underline decoration-dotted underline-offset-2 hover:text-navy-700"
          />
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            onClick={() => setAddingInclude(true)}
            className="text-navy-500 underline decoration-dotted underline-offset-2 hover:text-navy-700"
          >
            + Included item
          </button>
        </div>
      </div>

      {/* Packing & production — two labelled sections, rows tight beneath. */}
      <div className="flex min-w-0 flex-col gap-1">
        <SectionHead>Packing details</SectionHead>
        <Kv label="Pcs / ctn" alert={missingKeys.has("carton_pack")}>
          <InlineField
            className="w-14"
            value={numberText(sourcing?.carton_pack)}
            numeric
            validate={positiveProblem}
            save={(raw) => savePacking({ carton_pack: numOrNull(raw) })}
          />
        </Kv>
        <Kv
          label="Ctn dims"
          alert={
            missingKeys.has("carton_length") ||
            missingKeys.has("carton_width") ||
            missingKeys.has("carton_height")
          }
        >
          {/* ONE flex row, equal gaps: each × sits dead-centre between inputs and
              the unit dropdown is snug at the end with the same gap. */}
          <span className="flex flex-nowrap items-center gap-1.5">
            <InlineField
              className="w-8 shrink-0"
              value={numberText(sourcing?.carton_length)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_length: numOrNull(raw) })}
            />
            <span className="shrink-0 text-[11px] leading-none text-muted-foreground">×</span>
            <InlineField
              className="w-8 shrink-0"
              value={numberText(sourcing?.carton_width)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_width: numOrNull(raw) })}
            />
            <span className="shrink-0 text-[11px] leading-none text-muted-foreground">×</span>
            <InlineField
              className="w-8 shrink-0"
              value={numberText(sourcing?.carton_height)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_height: numOrNull(raw) })}
            />
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
        </Kv>
        <Kv label="Weight" alert={missingKeys.has("carton_weight")}>
          <span className="flex flex-nowrap items-center gap-1.5">
            <InlineField
              className="w-16 shrink-0"
              value={numberText(sourcing?.carton_weight)}
              display={weight3(sourcing?.carton_weight ?? null)}
              numeric
              validate={positiveProblem}
              save={(raw) => savePacking({ carton_weight: numOrNull(raw) })}
            />
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
        </Kv>

        <SectionHead>Production</SectionHead>
        <Kv label="MOQ">
          <InlineField
            className="w-14"
            value={product.moq == null ? "" : String(product.moq)}
            numeric
            validate={moqProblem}
            save={(raw) => saveProduct({ moq: numOrNull(raw) })}
          />
        </Kv>
        <Kv label="Lead time" alert={missingKeys.has("production_min_days")}>
          <RangeRow
            min={product.production_min_days == null ? "" : String(product.production_min_days)}
            max={product.production_max_days == null ? "" : String(product.production_max_days)}
            saveMin={(raw) => saveProduct({ production_min_days: numOrNull(raw) })}
            saveMax={(raw) => saveProduct({ production_max_days: numOrNull(raw) })}
            suffix="days"
          />
        </Kv>
        <ProductionExtras product={product} save={saveProduct} />
      </div>

      {/* Pricing */}
      <div className="min-w-0">
        <DecorationPricing
          productId={product.id}
          decorations={decorations}
          methods={methods}
          details={details}
        />
      </div>

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
  dim,
  className,
  extra,
  onOpen,
}: {
  label: string;
  path: string | undefined;
  dim?: boolean;
  className?: string;
  /** "+N" overlay count for the remaining images beyond the two shown. */
  extra?: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} — manage images`}
      className={`group relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-navy-100 bg-navy-50 ${
        className ?? "aspect-square w-full"
      }`}
    >
      {path ? (
        <img
          src={imageSrc(path)}
          alt=""
          loading="lazy"
          className={`size-full object-cover ${dim ? "opacity-50 saturate-[0.35]" : ""}`}
        />
      ) : (
        <span className="flex flex-col items-center gap-1 text-muted-foreground">
          <ImageIcon className="size-4" />
          {className ? null : (
            <span className="text-[10px] font-medium uppercase tracking-wide">No image</span>
          )}
        </span>
      )}
      {/* Count badge sits in the corner so the thumb's image stays visible. */}
      {extra ? (
        <span className="absolute right-0 top-0 rounded-bl-md bg-n-900/80 px-1 text-[9px] font-semibold leading-4 text-white">
          +{extra}
        </span>
      ) : null}
      <span className="absolute inset-x-0 bottom-0 bg-n-900/70 py-0.5 text-center text-[10px] font-semibold uppercase text-white opacity-0 transition group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

/**
 * STATUS control — the ONE customer-visibility field (products.status), through
 * the SAME staff-gated products update path the kebab uses. Draft → Live is
 * refused by the shared live gate until the row has a name and one image.
 * Independent of the costing chip beside it: Live + Incomplete is legal.
 */
function StatusControl({
  product,
  saveProduct,
}: {
  product: Product;
  saveProduct: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const live = product.status === "live";
  const write = (next: "draft" | "live") =>
    void saveProduct({ status: next }).then(
      () => toast.success(next === "live" ? "Live on the customer shop" : "Back to draft"),
      (error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Could not save"),
    );

  function goLive() {
    const problem = liveGateProblem(product);
    if (problem) {
      toast.error(problem);
      return;
    }
    write("live");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Status: ${live ? "Live" : "Draft"}`}
          className={`inline-flex h-[18px] items-center gap-1 rounded-full px-2 text-[11px] font-semibold leading-none transition-colors ${
            live
              ? "bg-lime-500 text-n-700 hover:bg-lime-400"
              : "border border-amber-400 text-amber-700 hover:bg-amber-50"
          }`}
        >
          {live ? "Live" : "Draft"}
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-[60]">
          <DropdownMenuItem onSelect={() => (live ? undefined : goLive())}>Live</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => (live ? setConfirming(true) : undefined)}>
            Draft
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move back to draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Customers will no longer see {product.name}. You can make it live again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => write("draft")}>Move to draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
            const live = product.status === "live";
            if (!live) {
              const problem = liveGateProblem(product);
              if (problem) {
                toast.error(problem);
                return;
              }
            }
            void saveProduct({ status: live ? "draft" : "live" }).then(
              () => toast.success(live ? "Back to draft" : "Live on the customer shop"),
              (error: unknown) =>
                toast.error(error instanceof Error ? error.message : "Could not save"),
            );
          }}
        >
          {product.status === "live" ? "Move to draft" : "Make live"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
