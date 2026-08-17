import {
  Container,
  Droplet,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Package,
  Palette,
  Pencil,
  Plane,
  Ruler,
  Sparkles,
  Ship,
  Weight,
} from "lucide-react";
import { useState } from "react";

import { airAvailable, imageSrc, seaAvailable, specValue, type Product } from "@/lib/catalog";
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
import type { PublicDecorationPricing } from "@/lib/pricing-types";
import { fallbackToOriginal } from "@/lib/image-variants";
import { qtyFloor } from "@/lib/quantity";
import { ProductPlaceholder } from "@/components/site/ProductPlaceholder";

/** Layout variants of the ONE product card. */
export type ProductCardViewMode = "grid" | "expanded";

type SpecIcon = typeof Layers;

const EXPANDED_SPECS: {
  label: string;
  key: keyof Product;
  icon: SpecIcon;
  line: "own" | "pair";
}[] = [
  { label: "Material", key: "material", icon: Layers, line: "own" },
  { label: "Features", key: "features", icon: Sparkles, line: "own" },
  { label: "Size", key: "size", icon: Ruler, line: "pair" },
  { label: "Capacity", key: "capacity", icon: Droplet, line: "pair" },
  { label: "Weight", key: "weight", icon: Weight, line: "pair" },
  { label: "Colours", key: "colour_option", icon: Palette, line: "pair" },
];

/** Customer-side money: always explicit about the currency. */
function usd(value: number) {
  return `US$${value.toFixed(2)}`;
}

/** Display-only: "15.000 kg" → "15 kg", "15.500 kg" → "15.5 kg". */
function trimZeros(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/(\d+)\.(\d*?)0+(?=\D|$)/g, (_m, int, frac) =>
    frac ? `${int}.${frac}` : int,
  );
}

/** Joins present fragments with the " · " separator grammar. */
function joinDots(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(" · ");
}

/** Sections with no data are omitted entirely on the customer side. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <p className="sheet-section-head">{title}</p>
      <div className="mt-0.5 space-y-1">{children}</div>
    </section>
  );
}

/**
 * Icon-led fact: icon replaces the label column. The fact word lives in the
 * native tooltip plus an sr-only span; values wrap under themselves.
 */
function IconFact({
  icon: Icon,
  label,
  chip = false,
  children,
}: {
  icon?: SpecIcon;
  label: string;
  chip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-start gap-1.5" title={label}>
      {chip ? (
        <span className="mt-[2px] flex shrink-0 items-center">
          <RushChip size="static" />
        </span>
      ) : Icon ? (
        <Icon className="mt-[3px] size-[13px] shrink-0 text-n-500" strokeWidth={1.75} />
      ) : null}
      <span className="sr-only">{label}</span>
      <span className="sheet-kv-value min-w-0">{children}</span>
    </span>
  );
}

/** Hero + clickable thumbnail strip. Expanded view only. */
function bandFor(quantities: number[], qty: number) {
  let hit: number | null = null;
  for (const value of quantities) if (qty >= value) hit = value;
  return hit;
}

/**
 * Deterministic pick of at most 4 tier columns for the compact grid table:
 * lowest, highest and the active band first, then the most "spread out"
 * remaining tiers (ties resolve to the higher tier).
 */
function miniColumns(all: number[], qty: number) {
  if (all.length <= 4) return all;
  const chosen = new Set<number>([0, all.length - 1]);
  const band = bandFor(all, qty);
  const bandIndex = band != null ? all.indexOf(band) : 0;
  if (bandIndex >= 0) chosen.add(bandIndex);
  while (chosen.size < 4) {
    let best = -1;
    let bestDistance = -1;
    for (let i = 0; i < all.length; i += 1) {
      if (chosen.has(i)) continue;
      let minDistance = Infinity;
      for (const index of chosen) minDistance = Math.min(minDistance, Math.abs(i - index));
      if (minDistance > bestDistance || (minDistance === bestDistance && i > best)) {
        bestDistance = minDistance;
        best = i;
      }
    }
    if (best < 0) break;
    chosen.add(best);
  }
  return [...chosen].sort((a, b) => a - b).map((index) => all[index]!);
}

/**
 * Compact 4-column tier matrix for the customer grid card. One method at a
 * time, cycled with ‹ ›. Unit prices only — no internals ever reach the DOM.
 */
function MiniPricing({
  bubbles,
  quantities,
  showAir,
  showSea,
  moq,
  qty,
}: {
  bubbles: PublicDecorationPricing[];
  quantities: number[];
  showAir: boolean;
  showSea: boolean;
  moq: number | null;
  qty: number;
}) {
  const [index, setIndex] = useState(0);
  const rows: { label: string; icon: typeof Plane; from: "air" | "sea" }[] = [];
  if (showAir) rows.push({ label: "Air", icon: Plane, from: "air" });
  if (showSea) rows.push({ label: "Sea", icon: Ship, from: "sea" });

  if (!bubbles.length || !quantities.length || !rows.length) {
    return (
      <div className="mt-3 hidden rounded-xl border border-dashed border-n-200 px-3 py-3 text-center text-[13px] text-n-500 [@container(min-width:220px)]:block">
        Pricing on request — add to your quote list
      </div>
    );
  }

  const bubble = bubbles[Math.min(index, bubbles.length - 1)]!;
  const airTable = bubble.tables.find((table) => table.mode === "air");
  const seaTable = bubble.tables.find((table) => table.mode === "sea");
  const columns = miniColumns(quantities, qty);
  const band = bandFor(quantities, qty);
  const cell = (from: "air" | "sea", value: number) => {
    const table = from === "air" ? airTable : seaTable;
    const row = table?.rows.find((entry) => entry.qty === value);
    return row ? row.unitUsd.toFixed(2) : "—";
  };

  return (
    <div className="mt-2.5 hidden rounded-xl border border-n-200 p-2 [@container(min-width:220px)]:block">
      <p className="text-[13px] font-semibold leading-snug text-navy-700 line-clamp-2">
        {bubble.methodName}
      </p>
      <div className="mt-0.5 flex h-[18px] items-center">
        <span className="sheet-kv-label">CIF US$</span>
        {bubbles.length > 1 ? (
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Previous method"
              onClick={() => setIndex((current) => (current - 1 + bubbles.length) % bubbles.length)}
              className="inline-flex size-[18px] items-center justify-center rounded-full text-n-600 outline-none transition-colors hover:text-navy-700 focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <ChevronLeft className="size-3" />
            </button>
            <span className="text-[11px] tabular-nums text-n-500">
              {Math.min(index, bubbles.length - 1) + 1} / {bubbles.length}
            </span>
            <button
              type="button"
              aria-label="Next method"
              onClick={() => setIndex((current) => (current + 1) % bubbles.length)}
              className="inline-flex size-[18px] items-center justify-center rounded-full text-n-600 outline-none transition-colors hover:text-navy-700 focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <ChevronRight className="size-3" />
            </button>
          </span>
        ) : null}
      </div>
      <table className="mt-1.5 w-full table-fixed border-separate border-spacing-0 tabular-nums">
        <thead>
          <tr>
            <th className="w-[34px] py-1" />
            {columns.map((value) => (
              <th
                key={value}
                className={`sheet-kv-label rounded-t-md px-1 py-1 text-right font-semibold ${
                  band === value ? "bg-lime-50 !text-navy-700" : ""
                }`}
              >
                {value}
                {moq != null && value === moq ? (
                  <span className="ml-0.5 text-[9px] normal-case tracking-normal">MOQ</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.label}>
              <td className="border-t border-n-200 py-1 pr-1" title={row.label}>
                <row.icon className="size-[13px] shrink-0 text-n-500" strokeWidth={1.75} />
                <span className="sr-only">{row.label}</span>
              </td>
              {columns.map((value) => (
                <td
                  key={value}
                  className={`border-t border-n-200 px-1 py-1 text-right text-[13px] ${
                    band === value ? "bg-lime-50" : ""
                  } ${band === value && rowIndex === rows.length - 1 ? "rounded-b-md" : ""}`}
                >
                  {cell(row.from, value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One priced decoration method. Columns are quantity bands; rows are the
 * transport options the product actually ships by.
 */
function PricingBubble({
  bubble,
  quantities,
  showAir,
  showSea,
  air,
  sea,
  rush,
  moq,
  qty,
}: {
  bubble: PublicDecorationPricing;
  quantities: number[];
  showAir: boolean;
  showSea: boolean;
  air: string | null;
  sea: string | null;
  rush: string | null;
  moq: number | null;
  qty: number;
}) {
  const airTable = bubble.tables.find((table) => table.mode === "air");
  const seaTable = bubble.tables.find((table) => table.mode === "sea");
  const band = bandFor(quantities, qty);
  const rows: {
    label: string;
    icon?: typeof Plane;
    chip?: boolean;
    lead: string | null;
    from?: "air" | "sea";
  }[] = [];
  if (showAir) rows.push({ label: "Air", icon: Plane, lead: air, from: "air" });
  if (showSea) rows.push({ label: "Sea", icon: Ship, lead: sea, from: "sea" });
  if (rush) rows.push({ label: "Rush", chip: true, lead: rush, from: "air" });
  if (!quantities.length || !rows.length) return null;

  const cell = (from: "air" | "sea", value: number) => {
    const table = from === "air" ? airTable : seaTable;
    const row = table?.rows.find((entry) => entry.qty === value);
    return row ? usd(row.unitUsd) : "—";
  };

  return (
    <div className="min-w-0 rounded-xl border border-n-200 bg-white p-3">
      <p className="card-value text-[13px]">{bubble.methodName}</p>
      <div className="-mx-1 mt-2 overflow-x-auto px-1">
        <table className="w-full min-w-[560px] table-fixed border-separate border-spacing-0 text-sm tabular-nums">
          <thead>
            <tr>
              <th className="sheet-kv-label w-[176px] py-1 text-left font-semibold" />
              {quantities.map((value) => (
                <th
                  key={value}
                  className={`sheet-kv-label rounded-t-md px-2 py-1 text-right font-semibold ${
                    band === value ? "bg-lime-50 !text-navy-700" : ""
                  }`}
                >
                  {value}
                  {moq != null && value === moq ? (
                    <span className="ml-1 text-[10px] normal-case tracking-normal">MOQ</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.label}>
                <td className="border-t border-n-200 py-1 pr-2 align-middle">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {row.chip ? <RushChip /> : null}
                    {row.icon ? (
                      <row.icon className="size-[13px] shrink-0 text-n-500" strokeWidth={1.75} />
                    ) : null}
                    <span className="text-[13px]">{row.label}</span>
                    {row.lead ? <span className="text-[11px] text-n-500">· {row.lead}</span> : null}
                  </span>
                </td>
                {quantities.map((value) => (
                  <td
                    key={value}
                    className={`border-t border-n-200 px-2 py-1 text-right ${
                      band === value ? "bg-lime-50" : ""
                    } ${band === value && index === rows.length - 1 ? "rounded-b-md" : ""}`}
                  >
                    {cell(row.from ?? "air", value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Hero + clickable thumbnail strip. Expanded view only. */
function ExpandedImages({
  images,
  alt,
  onOpen,
}: {
  images: string[];
  alt: string;
  onOpen: (index: number) => void;
}) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <div className="image-field">
        <ProductPlaceholder className="size-full" />
      </div>
    );
  }
  const current = images[Math.min(active, images.length - 1)] ?? images[0]!;
  return (
    <div>
      <div className="image-field image-field-bleed overflow-hidden rounded-xl">
        <img
          src={imageSrc(current, "card")}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={(event) => fallbackToOriginal(event, imageSrc(current))}
          onClick={() => onOpen(active)}
          className="image-field-media cursor-zoom-in"
        />
      </div>
      {images.length > 1 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {images.map((value, index) => (
            <button
              key={`${value}-${index}`}
              type="button"
              aria-label={`Show image ${index + 1}`}
              onClick={() => setActive(index)}
              className={`size-11 overflow-hidden rounded-md border bg-white ${
                index === active
                  ? "border-lime-500 ring-2 ring-lime-500"
                  : "border-n-200 hover:border-n-300"
              }`}
            >
              <img
                src={imageSrc(value, "thumb")}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(event) => fallbackToOriginal(event, imageSrc(value))}
                className="size-full object-contain"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
  // Drives the lime tier highlight in the expanded pricing bubbles.
  const [stepperQty, setStepperQty] = useState(() => qtyFloor(product.moq));
  const hidden = editMode && product.status !== "live";
  const air = airLeadLabel(product, shipping);
  const sea = seaLeadLabel(product, shipping);
  const rush = rushLeadLabel(product, shipping);
  const hasLead = air != null && sea != null;
  const hasMoq = product.moq != null;
  const showAir = airAvailable(product.shipping_methods);
  const showSea = seaAvailable(product.shipping_methods);
  const team = workspace === "supplier" && isStaff;

  // ONE source of pricing derivation, shared by the grid and expanded branches.
  const bubbles = pricing?.decorations ?? [];
  const priceBubbles = bubbles.length
    ? bubbles
    : pricing?.tables.length
      ? [{ methodName: "Blank / undecorated", tables: pricing.tables }]
      : ([] as PublicDecorationPricing[]);
  const unifiedQuantities = Array.from(
    new Set(
      priceBubbles.flatMap((bubble) =>
        bubble.tables.flatMap((table) => table.rows.map((row) => row.qty)),
      ),
    ),
  ).sort((a, b) => a - b);

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
    const specs = EXPANDED_SPECS.filter(
      (spec) => product[spec.key] != null && product[spec.key] !== "",
    );
    const packing = pricing?.packing;
    const showProduction = showAir || showSea || rush != null || product.moq != null;

    return (
      <article className="@container group relative grid gap-4 overflow-hidden rounded-2xl border border-n-200 bg-white p-3 lg:grid-cols-[300px_minmax(320px,380px)_1fr] lg:gap-6 lg:p-4">
        {editAffordance}
        <div className="min-w-0">
          <ExpandedImages images={images} alt={product.name} onOpen={setLightboxIndex} />
        </div>

        <div className="min-w-0">
          <p className="card-label">{product.sku ?? "—"}</p>
          <h3 className="card-title mt-1 text-base">{product.name}</h3>
          {product.description ? (
            <p className="mt-2 text-sm leading-5 text-n-600">{product.description}</p>
          ) : null}

          {specs.length ? (
            <Section title="Product details">
              {specs
                .filter((spec) => spec.line === "own")
                .map((spec) => (
                  <IconFact key={spec.label} icon={spec.icon} label={spec.label}>
                    {String(product[spec.key])}
                  </IconFact>
                ))}
              {specs.some((spec) => spec.line === "pair") ? (
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
                  {specs
                    .filter((spec) => spec.line === "pair")
                    .map((spec) => (
                      <IconFact key={spec.label} icon={spec.icon} label={spec.label}>
                        {String(product[spec.key])}
                      </IconFact>
                    ))}
                </div>
              ) : null}
            </Section>
          ) : null}

          {showProduction ? (
            <Section title="Production">
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
                {product.moq != null ? (
                  <span className="sheet-kv-value flex items-baseline gap-1.5">
                    <span className="sheet-kv-label">MOQ</span>
                    {specValue(product.moq)}
                  </span>
                ) : null}
                {showAir ? (
                  <IconFact icon={Plane} label="Air">
                    {air ?? "—"}
                  </IconFact>
                ) : null}
                {showSea ? (
                  <IconFact icon={Ship} label="Sea">
                    {sea ?? "—"}
                  </IconFact>
                ) : null}
                {rush ? (
                  <IconFact chip label="Rush">
                    {rush}
                  </IconFact>
                ) : null}
              </div>
            </Section>
          ) : null}

          {packing ? (
            (() => {
              const carton = joinDots([
                packing.pcsPerCtn != null ? `${packing.pcsPerCtn} pcs` : null,
                packing.ctnDims || null,
                trimZeros(packing.ctnWeight),
              ]);
              const freight = joinDots([
                packing.volPerCtn || null,
                packing.chargeablePerCtn
                  ? `${trimZeros(packing.chargeablePerCtn)} chargeable`
                  : null,
              ]);
              if (!carton && !freight) return null;
              return (
                <Section title="Packaging">
                  {carton ? (
                    <IconFact icon={Package} label="Carton">
                      {carton}
                    </IconFact>
                  ) : null}
                  {freight ? (
                    <IconFact icon={Container} label="Freight per carton">
                      {freight}
                    </IconFact>
                  ) : null}
                </Section>
              );
            })()
          ) : null}

          <div className="mt-4 max-w-[336px] border-t border-n-200 pt-3">
            <AddToQuoteRow product={product} variant="primary" onQuantityChange={setStepperQty} />
          </div>
        </div>

        <div className="min-w-0">
          <p className="sheet-section-head">Pricing details</p>
          {priceBubbles.length ? (
            <>
              <div className="mt-2 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(560px,100%),1fr))]">
                {priceBubbles.map((bubble) => (
                  <PricingBubble
                    key={bubble.methodName}
                    bubble={bubble}
                    quantities={unifiedQuantities}
                    showAir={showAir}
                    showSea={showSea}
                    air={air}
                    sea={sea}
                    rush={rush}
                    moq={product.moq}
                    qty={stepperQty}
                  />
                ))}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-n-500">
                <Info className="mt-px size-3 shrink-0" strokeWidth={2} />
                <span>
                  Price is in US$ and includes Cost, Insurance &amp; Freight to any Caribbean
                  island.
                </span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-n-500">
              Pricing on request — add this item to your quote list.
            </p>
          )}
        </div>
        {lightbox}
        {quickEdit}
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

      <div className="flex flex-1 flex-col p-2 pt-3 [@container(min-width:170px)]:p-3 [@container(min-width:170px)]:pt-3">
        <p className="card-label truncate">{product.sku ?? "—"}</p>
        <h3 className="card-title mt-1 line-clamp-2 h-[39px] overflow-hidden lg:h-[42px]">
          {product.name}
        </h3>

        {specRow}

        <MiniPricing
          bubbles={priceBubbles}
          quantities={unifiedQuantities}
          showAir={showAir}
          showSea={showSea}
          moq={product.moq}
          qty={stepperQty}
        />

        <div className="mt-auto pt-2.5">
          <AddToQuoteRow product={product} onQuantityChange={setStepperQty} />
        </div>
      </div>

      {lightbox}
      {quickEdit}
    </article>
  );
}
