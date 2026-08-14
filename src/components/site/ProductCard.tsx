import { Pencil, Plane, Ship } from "lucide-react";
import { useState } from "react";

import { airAvailable, seaAvailable, specValue, type Product } from "@/lib/catalog";
import { airLeadLabel, rushLeadLabel, seaLeadLabel, useShippingSettings } from "@/lib/shipping";
import { ProductImageCarousel } from "@/components/site/ProductImageCarousel";
import { ImageLightbox } from "@/components/site/ImageLightbox";
import { AddToQuoteRow } from "@/components/site/AddToQuoteRow";
import { useStaffSession } from "@/lib/staff-session";
import { ProductQuickEdit } from "@/components/site/ProductQuickEdit";
import { RushChip } from "@/components/site/RushChip";
import { ProductSourcingFetch } from "@/components/site/ProductTeamDetails";
import { useViewMode } from "@/lib/view-mode";
import type { PublicPricing } from "@/lib/pricing-types";

/** Layout variants of the ONE product card. */
export type ProductCardViewMode = "grid" | "expanded";

const EXPANDED_SPECS: { label: string; key: keyof Product }[] = [
  { label: "Material", key: "material" },
  { label: "Size", key: "size" },
  { label: "Capacity", key: "capacity" },
  { label: "Weight", key: "weight" },
  { label: "Colours", key: "colour_option" },
  { label: "Features", key: "features" },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function FlagBadge({ source }: { source: string }) {
  const usa = source === "USA Inventory";
  return (
    <span
      title={source}
      aria-label={source}
      className="absolute bottom-[10px] right-[10px] z-10 size-[var(--badge-size)] overflow-hidden rounded-full border-2 border-white shadow-card"
    >
      <img
        src={usa ? "https://flagcdn.com/w80/us.png" : "https://flagcdn.com/w80/cn.png"}
        alt={usa ? "USA Inventory" : "Factory Direct"}
        loading="lazy"
        width={22}
        height={22}
        className="size-full object-cover"
      />
    </span>
  );
}

function SpecLabel({ children }: { children: React.ReactNode }) {
  return <p className="card-label">{children}</p>;
}

function LeadRow({
  icon: Icon,
  value,
  chip = false,
}: {
  icon?: typeof Plane;
  value: string | null;
  chip?: boolean;
}) {
  return (
    <p className="card-value flex h-[18px] items-center gap-1.5 [@container(max-width:199px)]:text-[13px]">
      {chip ? <RushChip /> : null}
      {Icon ? <Icon className="size-[13px] shrink-0 text-n-500" strokeWidth={1.75} /> : null}
      <span
        className={`whitespace-nowrap${value == null ? " text-n-500" : ""}${
          chip ? " [@container(max-width:199px)]:text-[12px]" : ""
        }`}
      >
        {value ?? "—"}
      </span>
    </p>
  );
}

/**
 * Spec row (MOQ | Lead time) shared by the portrait customer card and the
 * landscape /team row — one implementation, never copied.
 */
function SpecRow({
  hasMoq,
  moq,
  rush,
  air,
  sea,
  showAir,
  showSea,
  hasLead,
}: {
  hasMoq: boolean;
  moq: number | null;
  rush: string | null;
  air: string | null;
  sea: string | null;
  showAir: boolean;
  showSea: boolean;
  hasLead: boolean;
}) {
  return (
    <div className="relative mt-3 flex h-[89px] items-stretch border-t border-n-200 pt-3 [@container(min-width:200px)]:grid [@container(min-width:200px)]:grid-cols-[40%_60%]">
      <div className="flex min-w-0 shrink-0 justify-start pr-[12px] [@container(min-width:200px)]:justify-center">
        <div className="min-w-0 text-left">
          <SpecLabel>MOQ</SpecLabel>
          <p
            className={`card-value mt-1 h-[18px] [@container(max-width:199px)]:text-[13px]${
              hasMoq ? "" : " !text-n-500"
            }`}
          >
            {hasMoq ? specValue(moq) : "—"}
          </p>
        </div>
      </div>
      <div
        className="mr-[12px] w-px shrink-0 self-stretch bg-n-200 [@container(min-width:200px)]:hidden"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-[40%] top-3 hidden w-px bg-n-200 [@container(min-width:200px)]:block"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 justify-start pr-[12px] [@container(min-width:200px)]:justify-center [@container(min-width:200px)]:pl-[12px] [@container(min-width:200px)]:pr-0">
        <div className="min-w-0 text-left">
          <SpecLabel>Lead time</SpecLabel>
          <div className="mt-1 flex h-[58px] flex-col justify-start space-y-0.5">
            {rush ? <LeadRow chip value={rush} /> : null}
            {showAir ? <LeadRow icon={Plane} value={hasLead ? air : null} /> : null}
            {showSea ? <LeadRow icon={Ship} value={hasLead ? sea : null} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({
  product,
  coverOnly = false,
  viewMode = "grid",
  pricing,
}: {
  product: Product;
  coverOnly?: boolean;
  viewMode?: ProductCardViewMode;
  pricing?: PublicPricing | undefined;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = product.images ?? [];
  const { editMode, isStaff } = useStaffSession();
  const workspace = useViewMode();
  const shipping = useShippingSettings();
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const hidden = editMode && product.status !== "live";
  const air = airLeadLabel(product, shipping);
  const sea = seaLeadLabel(product, shipping);
  const rush = rushLeadLabel(product, shipping);
  const hasLead = air != null && sea != null;
  const hasMoq = product.moq != null;
  const showAir = airAvailable(product.shipping_methods);
  const showSea = seaAvailable(product.shipping_methods);
  const team = workspace === "supplier" && isStaff;

  const editAffordance = editMode ? (
    <>
      <button
        type="button"
        aria-label={`Quick edit ${product.name}`}
        onClick={() => setQuickEditOpen(true)}
        className="absolute right-2 top-2 z-20 inline-flex size-7 items-center justify-center rounded-full border border-n-200 bg-white/95 text-navy-700 shadow-card transition-opacity duration-[180ms] ease-out hover:bg-lime-500 hover:text-n-700 sm:size-8 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
      >
        <Pencil className="size-3.5 sm:size-4" />
      </button>
      {hidden ? (
        <span className="card-label absolute left-2 top-2 z-20 rounded-full bg-n-700 px-2 py-0.5 !text-white">
          Hidden
        </span>
      ) : null}
    </>
  ) : null;

  const specRow = (
    <SpecRow
      hasMoq={hasMoq}
      moq={product.moq}
      rush={rush}
      air={air}
      sea={sea}
      showAir={showAir}
      showSea={showSea}
      hasLead={hasLead}
    />
  );

  const lightbox =
    lightboxIndex !== null ? (
      <ImageLightbox
        images={images}
        alt={product.name}
        startIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        footer={
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{product.name}</p>
              <p className="text-xs text-white/60">
                {product.sku ?? "—"}
                {!showAir || !showSea ? ` · ${showAir ? "Air only" : "Sea only"}` : ""}
              </p>
            </div>
            <div className="@container w-[15rem] shrink-0">
              <AddToQuoteRow product={product} tone="dark" />
            </div>
          </div>
        }
      />
    ) : null;

  const quickEdit =
    editMode && quickEditOpen ? (
      <ProductQuickEdit product={product} open={quickEditOpen} onOpenChange={setQuickEditOpen} />
    ) : null;

  if (viewMode === "expanded" && !team) {
    const airTable = pricing?.tables.find((table) => table.mode === "air");
    const seaTable = pricing?.tables.find((table) => table.mode === "sea");
    const quantities = Array.from(
      new Set(
        [...(airTable?.rows ?? []), ...(seaTable?.rows ?? [])].map((row) => row.qty),
      ),
    ).sort((a, b) => a - b);
    const specs = EXPANDED_SPECS.filter(
      (spec) => product[spec.key] != null && product[spec.key] !== "",
    );

    return (
      <article className="@container grid gap-4 overflow-hidden rounded-2xl border border-n-200 bg-white p-3 lg:grid-cols-[220px_1fr_minmax(280px,360px)] lg:gap-6 lg:p-4">
        <div className="overflow-hidden rounded-xl bg-white">
          <ProductImageCarousel images={images} alt={product.name} />
        </div>

        <div className="min-w-0">
          <p className="card-label">{product.sku ?? "—"}</p>
          <h3 className="card-title mt-1 text-base">{product.name}</h3>
          {product.description ? (
            <p className="mt-2 line-clamp-3 text-sm text-n-600">{product.description}</p>
          ) : null}

          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="card-label self-center">MOQ</dt>
            <dd className="card-value">{product.moq ?? "—"}</dd>
            {specs.map((spec) => (
              <div key={spec.label} className="col-span-2 grid grid-cols-subgrid">
                <dt className="card-label self-center">{spec.label}</dt>
                <dd className="card-value">{String(product[spec.key])}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 space-y-1 text-sm">
            {rush ? (
              <p className="flex items-center gap-1.5">
                <RushChip />
                <span>{rush}</span>
              </p>
            ) : null}
            {showAir ? (
              <p className="flex items-center gap-1.5">
                <Plane className="size-[13px] text-n-500" strokeWidth={1.75} />
                <span>{air ?? "—"}</span>
              </p>
            ) : null}
            {showSea ? (
              <p className="flex items-center gap-1.5">
                <Ship className="size-[13px] text-n-500" strokeWidth={1.75} />
                <span>{sea ?? "—"}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <p className="card-label">Pricing details</p>
          {quantities.length ? (
            <table className="mt-2 w-full text-sm tabular-nums">
              <thead>
                <tr className="card-label">
                  <th className="py-1 text-left font-semibold">Qty</th>
                  {showAir ? <th className="py-1 text-right font-semibold">Air</th> : null}
                  {showSea ? <th className="py-1 text-right font-semibold">Sea</th> : null}
                  {rush ? <th className="py-1 text-right font-semibold">Rush</th> : null}
                </tr>
              </thead>
              <tbody>
                {quantities.map((qty) => {
                  const airRow = airTable?.rows.find((row) => row.qty === qty);
                  const seaRow = seaTable?.rows.find((row) => row.qty === qty);
                  return (
                    <tr key={qty} className="border-t border-n-200">
                      <td className="py-1">{qty}</td>
                      {showAir ? (
                        <td className="py-1 text-right">{airRow ? money(airRow.unitUsd) : "—"}</td>
                      ) : null}
                      {showSea ? (
                        <td className="py-1 text-right">{seaRow ? money(seaRow.unitUsd) : "—"}</td>
                      ) : null}
                      {rush ? (
                        <td className="py-1 text-right">{airRow ? money(airRow.unitUsd) : "—"}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-n-500">
              Pricing on request — add this item to your quote list.
            </p>
          )}
          <p className="mt-2 text-[11px] text-n-500">
            Unit prices in USD, delivered duty unpaid (CIF). Decoration, duties and local charges
            are confirmed on your quote.
          </p>
          <div className="mt-3">
            <AddToQuoteRow product={product} />
          </div>
        </div>
      </article>
    );
  }

  if (team) {
    return (
      <article
        className={`group relative flex overflow-hidden rounded-2xl border bg-white transition-shadow duration-[180ms] ease-out [@media(hover:hover)]:hover:shadow-hover ${
          hidden ? "border-dashed border-n-300 opacity-60" : "border-n-200"
        }`}
      >
        <ProductSourcingFetch />
        {editAffordance}

        <div className="@container size-24 shrink-0 self-start overflow-hidden rounded-l-2xl bg-white md:size-[180px]">
          <ProductImageCarousel
            images={images}
            alt={product.name}
            fieldClassName="image-field-bleed"
            onImageTap={(i) => setLightboxIndex(i)}
          >
            <FlagBadge source={product.inventory_source} />
          </ProductImageCarousel>
        </div>

        <div className="@container flex w-full min-w-0 flex-col p-3 md:w-[320px] md:shrink-0">
          <p className="card-label truncate">{product.sku ?? "—"}</p>
          <h3 className="card-title mt-1 line-clamp-2 h-[39px] overflow-hidden lg:h-[42px]">
            {product.name}
          </h3>
          {specRow}
          <div className="mt-3">
            <AddToQuoteRow product={product} />
          </div>
        </div>

        {/* Reserved for internal details (follow-up). Intentionally empty. */}
        <div className="hidden flex-1 md:block" aria-hidden="true" />

        {lightbox}
        {quickEdit}
      </article>
    );
  }
  return (
    <article
      className={`group @container relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-shadow duration-[180ms] ease-out [@media(hover:hover)]:hover:shadow-hover ${
        hidden ? "border-dashed border-n-300 opacity-60" : "border-n-200"
      }`}
    >
      {editAffordance}
      <div className="overflow-hidden rounded-t-2xl bg-white">
        <ProductImageCarousel
          images={images}
          alt={product.name}
          coverOnly={coverOnly}
          fieldClassName="image-field-bleed"
          onImageTap={(i) => setLightboxIndex(i)}
        >
          <FlagBadge source={product.inventory_source} />
        </ProductImageCarousel>
      </div>

      <div className="flex flex-col p-2 pt-3 [@container(min-width:170px)]:p-3 [@container(min-width:170px)]:pt-3">
        <p className="card-label truncate">{product.sku ?? "—"}</p>
        <h3 className="card-title mt-1 line-clamp-2 h-[39px] overflow-hidden lg:h-[42px]">
          {product.name}
        </h3>

        {specRow}

        <div className="mt-3">
          <AddToQuoteRow product={product} />
        </div>
      </div>

      {lightbox}
      {quickEdit}
    </article>
  );
}
