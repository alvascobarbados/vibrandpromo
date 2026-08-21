import { GripVertical, Info, Plane, Ship, X } from "lucide-react";
import { useState } from "react";

import { imageSrc } from "@/lib/catalog";
import { fallbackToOriginal } from "@/lib/image-variants";
import { ProductPlaceholder } from "@/components/site/ProductPlaceholder";
import { RushChip } from "@/components/site/RushChip";
import { CURRENCY_TAG, INCOTERM_SCOPE, formatProposalDate } from "@/lib/proposals";
import { unifiedTiers, type ProposalSnapshot } from "@/lib/proposal-snapshot";
import { PROPOSAL_SETTINGS_FALLBACK } from "@/lib/proposal-settings-defaults";
import type { Incoterm, PricingCurrency, PricingTableMode } from "@/lib/pricing-types";

/** The ⓘ footer states exactly what the shown basis includes. */
export const PROPOSAL_FOOTER: Record<Incoterm, string> = {
  CIF: "Prices are in US$ and include Cost, Insurance & Freight to any Caribbean island.",
  LDP: "Prices are Landed & Duty-Paid in Barbados Dollars and exclude VAT.",
  LDF: "Prices are Landed & Duty-Free in Barbados Dollars and not subject to VAT.",
  FOB: "Prices are in US$ at the origin port — freight, insurance & duties not included.",
};

/**
 * Items per printed page. The default; proposal_settings overrides it per
 * project through the `itemsPerPage` prop, which drives the REAL page
 * containers rendered below — screen and print use the same grouping.
 */
export const ITEMS_PER_PAGE = 2;

/**
 * FIT BUDGET (see the print rebuild spec). A Letter sheet is 11in tall; the
 * page container's own 0.5in padding leaves 10in of printable height.
 *   page 1  : masthead + title + chips ≈ 2.1in, footer ≈ 0.45in
 *   pages 2+: slim header ≈ 0.6in, footer ≈ 0.45in
 * Every item block is capped at its share of what remains so nothing can ever
 * bleed onto the next sheet.
 */
function itemBudgetInches(pageIndex: number, perPage: number) {
  const reserved = pageIndex === 0 ? 2.1 + 0.45 : 0.6 + 0.45;
  return (10 - reserved) / Math.max(1, perPage);
}

/** Matrix cells are bare numbers — the currency lives once in the card header. */
function bare(value: number) {
  return value.toFixed(2);
}

export type ProposalDisplayItem = { id: string; snapshot: ProposalSnapshot };

export type ProposalHeader = {
  clientName: string;
  /** Optional named buyer at the client — the "Attention" line. */
  buyerName?: string | null;
  projectName: string;
  /** Permanent human-readable proposal number, e.g. VP-2026-0042. */
  proposalNumber?: string | null;
  status: "draft" | "generated";
  incoterm: Incoterm;
  currency: PricingCurrency;
  dateISO: string | null;
  preparedBy: string | null;
  itemCount: number;
};

/** One priced decoration method per card, at the project incoterm only. */
function ProposalPricing({ snapshot, maxMethods }: { snapshot: ProposalSnapshot; maxMethods: number }) {
  const tiers = unifiedTiers(snapshot);
  if (!snapshot.decorations.length || !tiers.length) {
    return (
      <div className="rounded-[14px] border border-dashed border-n-300 p-3 text-center text-[11px] text-n-500">
        Pricing on request
      </div>
    );
  }
  const rushLabel = snapshot.leadLabels.find((lead) => lead.mode === "rush")?.label ?? null;
  const airLabel = snapshot.leadLabels.find((lead) => lead.mode === "air")?.label ?? null;
  const seaLabel = snapshot.leadLabels.find((lead) => lead.mode === "sea")?.label ?? null;
  const shown = snapshot.decorations.slice(0, Math.max(1, maxMethods));
  const hidden = snapshot.decorations.length - shown.length;

  return (
    <div className="space-y-2">
      {shown.map((bubble) => {
        const tableFor = (mode: PricingTableMode) =>
          bubble.tables.find((table) => table.mode === mode);
        const fob = bubble.tables.some((table) => table.mode === "origin");
        const rows: {
          label: string;
          icon?: typeof Plane;
          chip?: boolean;
          lead: string | null;
          from: PricingTableMode;
        }[] = [];
        if (fob) {
          rows.push({ label: "FOB", lead: null, from: "origin" });
        } else {
          if (tableFor("air")) rows.push({ label: "Air", icon: Plane, lead: airLabel, from: "air" });
          if (tableFor("sea")) rows.push({ label: "Sea", icon: Ship, lead: seaLabel, from: "sea" });
          if (rushLabel && tableFor("air"))
            rows.push({ label: "Rush", chip: true, lead: rushLabel, from: "air" });
        }
        if (!rows.length) return null;
        const cell = (from: PricingTableMode, qty: number) => {
          const row = tableFor(from)?.rows.find((entry) => entry.qty === qty);
          return row ? bare(row.unit) : "—";
        };
        return (
          <div
            key={bubble.methodName}
            className="proposal-price-card overflow-hidden rounded-[14px] border border-n-200 bg-white"
          >
            <div className="flex items-center justify-between gap-3 border-b border-n-200 bg-n-50 px-3 py-1.5">
              <p className="truncate text-[13px] font-bold text-navy-900">{bubble.methodName}</p>
              <p className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-n-500">
                {snapshot.incoterm} {CURRENCY_TAG[snapshot.currency]} · unit
              </p>
            </div>
            <div className="px-3 pb-1.5 pt-1">
              <table className="w-full border-separate border-spacing-0 text-[12px] tabular-nums">
                <thead>
                  <tr>
                    <th className="py-0.5 text-left" />
                    {tiers.map((qty) => (
                      <th
                        key={qty}
                        className="px-1 py-0.5 text-right text-[9.5px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap text-n-500"
                      >
                        {qty}
                        {snapshot.moq != null && qty === snapshot.moq ? (
                          <span className="ml-0.5 text-[8.5px] normal-case tracking-normal">
                            MOQ
                          </span>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td className="border-t border-n-200 py-[3px] pr-1.5 align-middle text-[11.5px]">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          {row.chip ? <RushChip /> : null}
                          {row.icon ? (
                            <row.icon
                              className="size-[11px] shrink-0 text-n-500"
                              strokeWidth={1.75}
                            />
                          ) : null}
                          <span>{row.label}</span>
                          {row.lead ? (
                            <span className="text-[9px] text-n-500">· {row.lead}</span>
                          ) : null}
                        </span>
                      </td>
                      {tiers.map((qty) => (
                        <td
                          key={qty}
                          className="border-t border-n-200 px-1 py-[3px] text-right whitespace-nowrap"
                        >
                          {cell(row.from, qty)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {hidden > 0 ? (
        <p className="text-[10.5px] text-n-500">
          +{hidden} more decoration method{hidden === 1 ? "" : "s"} on request
        </p>
      ) : null}
    </div>
  );
}

/**
 * Hero square + up to three secondary thumbs. Never stacks. The hero is sized
 * from the block's own budget so a tighter page (items_per_page 3 or 4) shrinks
 * the picture instead of clipping the thumbs or the price card.
 */
export function galleryInches(budgetInches: number) {
  const hero = Math.min(2.6, Math.max(1.25, budgetInches - 1.1));
  return { hero, thumb: Math.min(0.62, hero * 0.24) };
}

function ItemGallery({
  snapshot,
  hero: heroIn,
  thumb: thumbIn,
}: {
  snapshot: ProposalSnapshot;
  hero: number;
  thumb: number;
}) {
  const hero = snapshot.images[0] ?? null;
  const secondaries = snapshot.images.slice(1, 4);
  return (
    <div className="shrink-0" style={{ width: `${heroIn}in` }}>
      <div
        className="overflow-hidden rounded-[14px] border border-n-200 bg-white"
        style={{ height: `${heroIn}in`, width: `${heroIn}in` }}
      >
        {hero ? (
          <img
            src={imageSrc(hero, "card")}
            onError={(event) => fallbackToOriginal(event, imageSrc(hero))}
            alt={snapshot.name}
            className="size-full object-contain"
          />
        ) : (
          <ProductPlaceholder className="size-full" />
        )}
      </div>
      {secondaries.length ? (
        <div className="mt-2 flex gap-2">
          {secondaries.map((path, index) => (
            <div
              key={`${path}-${index}`}
              className="shrink-0 overflow-hidden rounded-[8px] border border-n-200 bg-white"
              style={{ height: `${thumbIn}in`, width: `${thumbIn}in` }}
            >
              <img
                src={imageSrc(path, "thumb")}
                onError={(event) => fallbackToOriginal(event, imageSrc(path))}
                alt={`${snapshot.name} view ${index + 2}`}
                className="size-full object-contain"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ItemBlock({
  item,
  index,
  readOnly,
  budgetInches,
  onRemove,
  dragProps,
  dragging = false,
  dropSide,
}: {
  item: ProposalDisplayItem;
  index: number;
  readOnly: boolean;
  budgetInches: number;
  onRemove?: (id: string) => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragging?: boolean;
  dropSide?: "before" | "after" | null;
}) {
  const snapshot = item.snapshot;
  const taxonomy = [snapshot.category, snapshot.subcategory].filter(Boolean).join(" › ");
  const specs = [
    ...snapshot.specs,
    ...(snapshot.moq != null ? [{ label: "MOQ", value: String(snapshot.moq) }] : []),
  ];
  /** Roomy budgets fit both cards; tight budgets clamp to the first method. */
  const maxMethods = budgetInches >= 4 ? 2 : 1;
  const gallery = galleryInches(budgetInches);

  return (
    <div className="proposal-item-slot relative" style={{ maxHeight: `${budgetInches}in` }}>
      {dropSide === "before" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-[2px] h-[3px] rounded-full bg-lime-500"
        />
      ) : null}
      {dropSide === "after" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-[2px] h-[3px] rounded-full bg-lime-500"
        />
      ) : null}
      <div
        {...(dragProps ?? {})}
        className={`proposal-item group relative grid items-stretch gap-[0.26in] overflow-hidden border-b border-n-100 py-3 transition-colors ${
          dragging ? "rounded-xl bg-white shadow-lg ring-1 ring-n-200" : "hover:bg-n-50/40"
        }`}
        style={{
          maxHeight: `${budgetInches}in`,
          gridTemplateColumns: `${gallery.hero}in minmax(0,1fr)`,
        }}
      >
        {readOnly ? null : (
          <div className="proposal-no-print absolute -left-[26px] top-3 flex flex-col items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-navy-900 text-[10px] font-bold text-white">
              {index + 1}
            </span>
            <span
              aria-hidden="true"
              className="proposal-handle flex cursor-grab items-center justify-center text-n-400"
            >
              <GripVertical className="size-4" />
            </span>
          </div>
        )}

        <ItemGallery snapshot={snapshot} hero={gallery.hero} thumb={gallery.thumb} />

        <div className="flex min-w-0 flex-col">
          {taxonomy ? (
            <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.14em] text-n-500">
              {taxonomy}
            </p>
          ) : null}
          <h3 className="mt-0.5 text-[19px] font-[750] leading-tight text-navy-900">
            {snapshot.name}
          </h3>
          {snapshot.sku ? (
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-n-500">
              {snapshot.sku}
            </p>
          ) : null}

          {snapshot.description ? (
            <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-n-600">
              {snapshot.description}
            </p>
          ) : null}

          {specs.length ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-0.5 text-[12px]">
              {specs.map((spec, specIndex) => (
                <div key={`${spec.label}-${specIndex}`} className="flex gap-1.5">
                  <dt className="shrink-0 font-semibold text-n-500">{spec.label}</dt>
                  <dd className="min-w-0 truncate text-navy-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {snapshot.leadLabels.length ? (
            <p className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-n-600">
              {snapshot.leadLabels.map((lead) => (
                <span key={lead.mode} className="inline-flex items-center gap-1">
                  {lead.mode === "air" ? (
                    <Plane className="size-[13px] text-n-500" strokeWidth={1.75} />
                  ) : lead.mode === "sea" ? (
                    <Ship className="size-[13px] text-n-500" strokeWidth={1.75} />
                  ) : (
                    <RushChip />
                  )}
                  {lead.label}
                </span>
              ))}
            </p>
          ) : null}

          <div className="mt-auto pt-2">
            <ProposalPricing snapshot={snapshot} maxMethods={maxMethods} />
          </div>
        </div>

        {readOnly ? null : (
          <button
            type="button"
            aria-label={`Remove ${snapshot.name} from this proposal`}
            onClick={() => onRemove?.(item.id)}
            className="proposal-no-print absolute right-0 top-2 inline-flex size-7 items-center justify-center rounded-full text-n-500 opacity-0 transition-opacity hover:bg-n-100 hover:text-navy-900 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 group-hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The ONE proposal page body. The staff editor renders it with handles and
 * remove buttons; /p/{token} renders the identical markup in read-only mode
 * from frozen snapshots. Items stay ONE flat ordered list — the page grouping
 * below is presentational only, recomputed at render.
 */
export function ProposalDocument({
  header,
  items,
  readOnly = false,
  onRemove,
  onReorder,
  onAdd,
  footer,
  footerNote,
  footerText,
  itemsPerPage = ITEMS_PER_PAGE,
}: {
  header: ProposalHeader;
  items: ProposalDisplayItem[];
  readOnly?: boolean;
  onRemove?: (id: string) => void;
  onReorder?: (ids: string[]) => void;
  onAdd?: () => void;
  footer?: React.ReactNode;
  footerNote?: React.ReactNode;
  footerText?: string | null;
  itemsPerPage?: number;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; side: "before" | "after" } | null>(null);

  function clearDrag() {
    setDragId(null);
    setDropAt(null);
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId || !onReorder) {
      clearDrag();
      return;
    }
    const ids = items.map((item) => item.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      clearDrag();
      return;
    }
    const [moved] = ids.splice(from, 1);
    const targetIndex = ids.indexOf(targetId);
    const insertAt = dropAt?.side === "after" ? targetIndex + 1 : targetIndex;
    ids.splice(insertAt, 0, moved as string);
    onReorder(ids);
    clearDrag();
  }

  const chip = "rounded-full border border-n-200 px-2.5 py-0.5 text-[11.5px] text-n-600";
  const perPage = Math.max(1, itemsPerPage);

  /** Presentational grouping only — the DB order is untouched. */
  const pages: ProposalDisplayItem[][] = [];
  for (let index = 0; index < items.length; index += perPage) {
    pages.push(items.slice(index, index + perPage));
  }
  if (!pages.length) pages.push([]);
  const pageCount = pages.length;

  const footerLeft = footerText?.trim()
    ? footerText.trim()
    : PROPOSAL_SETTINGS_FALLBACK.footer_text;

  function itemProps(item: ProposalDisplayItem) {
    if (readOnly) return {};
    return {
      dragProps: {
        draggable: true,
        onDragStart: () => setDragId(item.id),
        onDragEnd: () => clearDrag(),
        onDragOver: (event: React.DragEvent) => {
          event.preventDefault();
          if (!dragId || dragId === item.id) return;
          const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
          const side = event.clientY > box.top + box.height / 2 ? "after" : "before";
          setDropAt((prev) =>
            prev?.id === item.id && prev.side === side ? prev : { id: item.id, side },
          );
        },
        onDragLeave: () => setDropAt((prev) => (prev?.id === item.id ? null : prev)),
        onDrop: () => dropOn(item.id),
      } as React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean },
    };
  }

  return (
    <div className="proposal-doc">
      {pages.map((pageItems, pageIndex) => {
        const budget = itemBudgetInches(pageIndex, perPage);
        const isLast = pageIndex === pageCount - 1;
        return (
          <section
            key={`page-${pageIndex}`}
            className={`proposal-page ${isLast ? "proposal-page-last" : ""}`}
          >
            {pageIndex === 0 ? (
              <header className="proposal-masthead">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-[22px] font-extrabold leading-none tracking-tight text-navy-900">
                      vibrand<span className="text-lime-500">.</span>
                    </p>
                    <p className="mt-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.28em] text-n-500">
                      Proposal
                    </p>
                  </div>
                  <div className="text-right text-[11.5px] text-n-600">
                    {header.proposalNumber ? (
                      <p className="text-[13px] font-semibold tabular-nums text-navy-900">
                        {header.proposalNumber}
                      </p>
                    ) : null}
                    <p>{formatProposalDate(header.dateISO)}</p>
                    {header.preparedBy ? <p>Prepared by {header.preparedBy}</p> : null}
                  </div>
                </div>
                <div className="mt-2.5 h-[2.5px] w-full rounded-full bg-lime-500" />
                <div className="pt-3.5">
                  <h2 className="text-[19px] font-bold text-navy-900">
                    {header.clientName}{" "}
                    <span className="font-medium text-n-500">— {header.projectName}</span>
                  </h2>
                  {header.buyerName ? (
                    <p className="mt-0.5 text-[12.5px] text-n-600">
                      Prepared for {header.buyerName}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px]">
                    <span className="rounded-full bg-navy-900 px-2.5 py-0.5 font-bold uppercase tracking-[0.1em] text-white">
                      {header.incoterm} {CURRENCY_TAG[header.currency]}
                    </span>
                    <span className={chip}>{INCOTERM_SCOPE[header.incoterm]}</span>
                  </div>
                </div>
              </header>
            ) : (
              <header className="proposal-slim-header">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="truncate text-[13px] font-semibold text-navy-900">
                    {header.clientName} — {header.projectName}
                  </p>
                  <p className="shrink-0 text-[11px] text-n-500">
                    {header.proposalNumber ? `${header.proposalNumber} · ` : ""}
                    {header.incoterm} {CURRENCY_TAG[header.currency]} ·{" "}
                    {formatProposalDate(header.dateISO)}
                  </p>
                </div>
                <div className="mt-1.5 h-px w-full bg-lime-500" />
              </header>
            )}

            <div className="mt-3.5 flex-1">
              {pageItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No items on this proposal yet.
                </p>
              ) : (
                pageItems.map((item, indexOnPage) => {
                  const flatIndex = pageIndex * perPage + indexOnPage;
                  return (
                    <ItemBlock
                      key={item.id}
                      item={item}
                      index={flatIndex}
                      readOnly={readOnly}
                      budgetInches={budget}
                      dragging={dragId === item.id}
                      dropSide={
                        dropAt && dropAt.id === item.id && dragId && dragId !== item.id
                          ? dropAt.side
                          : null
                      }
                      {...(onRemove ? { onRemove } : {})}
                      {...itemProps(item)}
                    />
                  );
                })
              )}
              {!readOnly && isLast ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="proposal-no-print mt-4 w-full rounded-xl border border-dashed border-n-300 py-3 text-sm font-semibold text-navy-700 hover:border-lime-500 hover:bg-lime-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  ＋ Add items from the catalogue
                </button>
              ) : null}
            </div>

            <footer className="proposal-page-footer mt-auto flex items-end justify-between gap-4 border-t border-n-200 pt-2">
              <p className="min-w-0 flex-1 text-[10px] leading-snug text-n-500">
                {footerNote ? <span className="block">{footerNote}</span> : null}
                <span className="block">{footerLeft}</span>
                {pageIndex === 0 ? (
                  <span className="mt-0.5 flex items-start gap-1 text-n-500">
                    <Info className="mt-[1px] size-3 shrink-0" />
                    <span>{PROPOSAL_FOOTER[header.incoterm]}</span>
                  </span>
                ) : null}
              </p>
              <div className="flex shrink-0 items-center gap-2 text-[10px] text-n-500">
                {isLast && footer ? <span className="proposal-no-print">{footer}</span> : null}
                <span>
                  Page {pageIndex + 1} of {pageCount}
                </span>
              </div>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
