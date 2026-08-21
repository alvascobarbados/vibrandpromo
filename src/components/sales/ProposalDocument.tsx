import { GripVertical, Info, Plane, Ship, X } from "lucide-react";
import { useState } from "react";

import { imageSrc } from "@/lib/catalog";
import { fallbackToOriginal } from "@/lib/image-variants";
import { ProductPlaceholder } from "@/components/site/ProductPlaceholder";
import { RushChip } from "@/components/site/RushChip";
import { CURRENCY_TAG, INCOTERM_SCOPE, formatProposalDate } from "@/lib/proposals";
import { unifiedTiers, type ProposalSnapshot } from "@/lib/proposal-snapshot";
import type { Incoterm, PricingCurrency, PricingTableMode } from "@/lib/pricing-types";

/** The ⓘ footer states exactly what the shown basis includes. */
export const PROPOSAL_FOOTER: Record<Incoterm, string> = {
  CIF: "Prices are in US$ and include Cost, Insurance & Freight to any Caribbean island.",
  LDP: "Prices are Landed & Duty-Paid in Barbados Dollars and exclude VAT.",
  LDF: "Prices are Landed & Duty-Free in Barbados Dollars and not subject to VAT.",
  FOB: "Prices are in US$ at the origin port — freight, insurance & duties not included.",
};

/** Items per printed page. Part 4 reads this from proposal_settings. */
export const ITEMS_PER_PAGE = 2;

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
  status: "draft" | "generated";
  incoterm: Incoterm;
  currency: PricingCurrency;
  dateISO: string | null;
  preparedBy: string | null;
  itemCount: number;
};

/** One priced decoration method per card, at the project incoterm only. */
function ProposalPricing({ snapshot }: { snapshot: ProposalSnapshot }) {
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

  return (
    <div className="space-y-2.5">
      {snapshot.decorations.map((bubble) => {
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
            className="break-inside-avoid overflow-hidden rounded-[14px] border border-n-200 bg-white"
          >
            <div className="flex items-center justify-between gap-3 border-b border-n-200 bg-n-50 px-3 py-2">
              <p className="truncate text-[14px] font-bold text-navy-900">{bubble.methodName}</p>
              <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-n-500">
                {snapshot.incoterm} {CURRENCY_TAG[snapshot.currency]} · unit
              </p>
            </div>
            <div className="overflow-x-auto px-3 pb-2 pt-1.5">
              <table className="w-full border-separate border-spacing-0 text-[13px] tabular-nums">
                <thead>
                  <tr>
                    <th className="py-1 text-left" />
                    {tiers.map((qty) => (
                      <th
                        key={qty}
                        className="px-1 py-1 text-right text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap text-n-500"
                      >
                        {qty}
                        {snapshot.moq != null && qty === snapshot.moq ? (
                          <span className="ml-0.5 text-[9px] normal-case tracking-normal">MOQ</span>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td className="border-t border-n-200 py-1 pr-1.5 align-middle text-[12.5px]">
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
                          className="border-t border-n-200 px-1 py-1 text-right whitespace-nowrap"
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
    </div>
  );
}

/** 340px hero + up to three 76px secondary thumbs. */
function ItemGallery({ snapshot }: { snapshot: ProposalSnapshot }) {
  const hero = snapshot.images[0] ?? null;
  const secondaries = snapshot.images.slice(1, 4);
  return (
    <div className="w-full max-w-full md:w-[340px]">
      <div className="aspect-square w-full overflow-hidden rounded-[16px] border border-n-200 bg-white">
        {hero ? (
          <img
            src={imageSrc(hero, "card")}
            onError={(event) => fallbackToOriginal(event, imageSrc(hero))}
            alt={snapshot.name}
            loading="lazy"
            className="size-full object-contain"
          />
        ) : (
          <ProductPlaceholder className="size-full" />
        )}
      </div>
      {secondaries.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {secondaries.map((path, index) => (
            <div
              key={`${path}-${index}`}
              className="size-[76px] overflow-hidden rounded-[10px] border border-n-200 bg-white"
            >
              <img
                src={imageSrc(path, "thumb")}
                onError={(event) => fallbackToOriginal(event, imageSrc(path))}
                alt={`${snapshot.name} view ${index + 2}`}
                loading="lazy"
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
  onRemove,
  dragProps,
  dragging = false,
  dropSide,
}: {
  item: ProposalDisplayItem;
  index: number;
  readOnly: boolean;
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

  return (
    <div className="relative">
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
        className={`proposal-item group relative grid grid-cols-1 items-stretch gap-6 border-b border-n-100 px-5 py-7 transition-colors md:px-[34px] md:py-8 md:grid-cols-[340px_minmax(0,1fr)] md:gap-[34px] ${
          dragging ? "rounded-xl bg-white shadow-lg ring-1 ring-n-200" : "hover:bg-n-50/40"
        }`}
      >
        {readOnly ? null : (
          <div className="proposal-no-print absolute left-1 top-7 md:left-2 md:top-8 flex flex-col items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
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

        <ItemGallery snapshot={snapshot} />

        <div className="flex min-w-0 flex-col">
          {taxonomy ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-n-500">
              {taxonomy}
            </p>
          ) : null}
          <h3 className="mt-1 text-[24px] font-[750] leading-tight text-navy-900">
            {snapshot.name}
          </h3>
          {snapshot.sku ? (
            <p className="mt-0.5 text-[11.5px] uppercase tracking-[0.08em] text-n-500">
              {snapshot.sku}
            </p>
          ) : null}

          {snapshot.description ? (
            <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-n-600">
              {snapshot.description}
            </p>
          ) : null}

          {specs.length ? (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[14px] sm:grid-cols-2">
              {specs.map((spec, specIndex) => (
                <div key={`${spec.label}-${specIndex}`} className="flex gap-1.5">
                  <dt className="shrink-0 font-semibold text-n-500">{spec.label}</dt>
                  <dd className="min-w-0 text-navy-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {snapshot.leadLabels.length ? (
            <p className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-n-600">
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

          <div className="mt-auto pt-4">
            <ProposalPricing snapshot={snapshot} />
          </div>
        </div>

        {readOnly ? null : (
          <button
            type="button"
            aria-label={`Remove ${snapshot.name} from this proposal`}
            onClick={() => onRemove?.(item.id)}
            className="proposal-no-print absolute right-3 top-6 inline-flex size-7 items-center justify-center rounded-full text-n-500 opacity-0 transition-opacity hover:bg-n-100 hover:text-navy-900 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 group-hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Editor-only rhythm marker showing where the printed page breaks. */
function PageMarker({ page }: { page: number }) {
  return (
    <div className="proposal-no-print flex items-center gap-3 px-5 py-2 md:px-[34px]">
      <span className="h-0 flex-1 border-t border-dashed border-n-300" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-n-400">
        Page {page} begins
      </span>
      <span className="h-0 flex-1 border-t border-dashed border-n-300" />
    </div>
  );
}

/**
 * The ONE proposal page body. The staff editor renders it with handles,
 * remove buttons and page markers; /p/{token} renders the identical markup in
 * read-only mode from frozen snapshots.
 */
export function ProposalDocument({
  header,
  items,
  readOnly = false,
  onRemove,
  onReorder,
  onAdd,
  footer,
}: {
  header: ProposalHeader;
  items: ProposalDisplayItem[];
  readOnly?: boolean;
  onRemove?: (id: string) => void;
  onReorder?: (ids: string[]) => void;
  onAdd?: () => void;
  footer?: React.ReactNode;
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

  return (
    <div className="proposal-doc">
      <header className="proposal-print-header px-5 pt-7 md:px-[34px] md:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[22px] font-extrabold leading-none tracking-tight text-navy-900">
              vibrand<span className="text-lime-500">.</span>
            </p>
            <p className="mt-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.28em] text-n-500">
              Proposal
            </p>
          </div>
          <div className="text-right text-[12.5px] text-n-600">
            <p>{formatProposalDate(header.dateISO)}</p>
            {header.preparedBy ? <p>Prepared by {header.preparedBy}</p> : null}
            <p>
              {header.itemCount} item{header.itemCount === 1 ? "" : "s"} ·{" "}
              {header.status === "generated" ? "Generated" : "Draft"}
            </p>
          </div>
        </div>
        <div className="mt-3 h-[2.5px] w-full rounded-full bg-lime-500" />

        <div className="pt-5">
          <h2 className="text-xl font-bold text-navy-900">
            {header.clientName}{" "}
            <span className="font-medium text-n-500">— {header.projectName}</span>
          </h2>
          {header.buyerName ? (
            <p className="mt-1 text-[13px] text-n-600">Prepared for {header.buyerName}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
            <span className="rounded-full bg-navy-900 px-2.5 py-0.5 font-bold uppercase tracking-[0.1em] text-white">
              {header.incoterm} {CURRENCY_TAG[header.currency]}
            </span>
            <span className={chip}>{INCOTERM_SCOPE[header.incoterm]}</span>
          </div>
        </div>
      </header>

      <div className="mt-6 border-t border-n-100">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No items on this proposal yet.
          </p>
        ) : (
          items.map((item, index) => (
            <div key={item.id}>
              <ItemBlock
                item={item}
                index={index}
                readOnly={readOnly}
                dragging={dragId === item.id}
                dropSide={
                  dropAt && dropAt.id === item.id && dragId && dragId !== item.id
                    ? dropAt.side
                    : null
                }
                {...(onRemove ? { onRemove } : {})}
                {...(readOnly
                  ? {}
                  : {
                      dragProps: {
                        draggable: true,
                        onDragStart: () => setDragId(item.id),
                        onDragEnd: () => clearDrag(),
                        onDragOver: (event: React.DragEvent) => {
                          event.preventDefault();
                          if (!dragId || dragId === item.id) return;
                          const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
                          const side =
                            event.clientY > box.top + box.height / 2 ? "after" : "before";
                          setDropAt((prev) =>
                            prev?.id === item.id && prev.side === side
                              ? prev
                              : { id: item.id, side },
                          );
                        },
                        onDragLeave: () =>
                          setDropAt((prev) => (prev?.id === item.id ? null : prev)),
                        onDrop: () => dropOn(item.id),
                      } as React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean },
                    })}
              />
              {!readOnly &&
              (index + 1) % ITEMS_PER_PAGE === 0 &&
              index + 1 < items.length ? (
                <PageMarker page={(index + 1) / ITEMS_PER_PAGE + 1} />
              ) : null}
            </div>
          ))
        )}
      </div>

      {readOnly ? null : (
        <div className="px-5 pt-6 md:px-[34px]">
          <button
            type="button"
            onClick={onAdd}
            className="proposal-no-print w-full rounded-xl border border-dashed border-n-300 py-4 text-sm font-semibold text-navy-700 hover:border-lime-500 hover:bg-lime-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            ＋ Add items from the catalogue
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-n-200 px-5 py-5 md:px-[34px]">
        <p className="flex max-w-[70%] items-start gap-2 text-[11px] text-n-600">
          <Info className="mt-[1px] size-3.5 shrink-0 text-n-500" />
          <span>{PROPOSAL_FOOTER[header.incoterm]}</span>
        </p>
        {footer}
      </div>
    </div>
  );
}
