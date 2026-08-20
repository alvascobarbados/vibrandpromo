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

/** Bubble cells are bare numbers — the currency lives once in the bubble tag. */
function bare(value: number) {
  return value.toFixed(2);
}

export type ProposalDisplayItem = { id: string; snapshot: ProposalSnapshot };

export type ProposalHeader = {
  clientName: string;
  projectName: string;
  status: "draft" | "generated";
  incoterm: Incoterm;
  currency: PricingCurrency;
  dateISO: string | null;
  preparedBy: string | null;
  itemCount: number;
};

/** One priced decoration method, at the project incoterm only. */
function ProposalPricing({ snapshot }: { snapshot: ProposalSnapshot }) {
  const tiers = unifiedTiers(snapshot);
  if (!snapshot.decorations.length || !tiers.length) {
    return (
      <div className="rounded-xl border border-dashed border-n-300 p-3 text-center text-[11px] text-n-500">
        Pricing on request
      </div>
    );
  }
  const rushLabel = snapshot.leadLabels.find((lead) => lead.mode === "rush")?.label ?? null;
  const airLabel = snapshot.leadLabels.find((lead) => lead.mode === "air")?.label ?? null;
  const seaLabel = snapshot.leadLabels.find((lead) => lead.mode === "sea")?.label ?? null;

  return (
    <div className="space-y-2">
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
            className="break-inside-avoid rounded-xl border border-n-200 bg-white p-2.5"
          >
            <p className="card-value text-[12px]">{bubble.methodName}</p>
            <p className="sheet-kv-label mt-0.5">
              {snapshot.incoterm} {CURRENCY_TAG[snapshot.currency]} · unit price
            </p>
            <div className="mt-1.5 overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-[12px] tabular-nums">
                <thead>
                  <tr>
                    <th className="sheet-kv-label py-1 text-left font-semibold" />
                    {tiers.map((qty) => (
                      <th
                        key={qty}
                        className="sheet-kv-label px-1.5 py-1 text-right font-semibold whitespace-nowrap"
                      >
                        {qty}
                        {snapshot.moq != null && qty === snapshot.moq ? (
                          <span className="ml-1 text-[10px] normal-case tracking-normal">MOQ</span>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td className="border-t border-n-200 py-1 pr-2 align-middle">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          {row.chip ? <RushChip /> : null}
                          {row.icon ? (
                            <row.icon
                              className="size-[12px] shrink-0 text-n-500"
                              strokeWidth={1.75}
                            />
                          ) : null}
                          <span>{row.label}</span>
                          {row.lead ? (
                            <span className="text-[10px] text-n-500">· {row.lead}</span>
                          ) : null}
                        </span>
                      </td>
                      {tiers.map((qty) => (
                        <td
                          key={qty}
                          className="border-t border-n-200 px-1.5 py-1 text-right whitespace-nowrap"
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

function ItemImage({ snapshot }: { snapshot: ProposalSnapshot }) {
  if (!snapshot.image) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-lg border border-n-200">
        <ProductPlaceholder />
      </div>
    );
  }
  return (
    <div className="aspect-square w-full overflow-hidden rounded-lg border border-n-200 bg-white">
      <img
        src={imageSrc(snapshot.image, "card")}
        onError={(event) => fallbackToOriginal(event, imageSrc(snapshot.image as string))}
        alt={snapshot.name}
        loading="lazy"
        className="size-full object-contain"
      />
    </div>
  );
}

function ItemRow({
  item,
  readOnly,
  onRemove,
  dragProps,
  dragging = false,
  dropSide,
}: {
  item: ProposalDisplayItem;
  readOnly: boolean;
  onRemove?: (id: string) => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragging?: boolean;
  dropSide?: "before" | "after" | null;
}) {
  const snapshot = item.snapshot;
  // "{SKU} · {Category} › {Subcategory}" — the dot splits SKU from taxonomy.
  const taxonomy = [snapshot.category, snapshot.subcategory].filter(Boolean).join(" › ");
  const skuLine = [snapshot.sku, taxonomy].filter(Boolean).join(" · ");

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
        className={`proposal-item grid items-start gap-3 border-b border-n-200 py-4 transition-transform ${
          dragging ? "scale-[1.01] rounded-xl bg-white shadow-lg ring-1 ring-n-200" : ""
        }`}
        style={{
          gridTemplateColumns: readOnly
            ? "116px minmax(0,1fr) 300px"
            : "26px 116px minmax(0,1fr) 300px 30px",
        }}
      >
        {readOnly ? null : (
          <span
            aria-hidden="true"
            className="proposal-handle mt-1 flex cursor-grab items-center justify-center text-n-400"
          >
            <GripVertical className="size-4" />
          </span>
        )}
        <ItemImage snapshot={snapshot} />
        <div className="min-w-0">
          <p className="card-label">{skuLine}</p>
          <p className="mt-0.5 text-[15px] font-semibold text-navy-900">{snapshot.name}</p>
          {snapshot.specs.length || snapshot.moq != null ? (
            <p className="mt-1 text-[12px] text-n-600">
              {snapshot.specs.map((spec, index) => (
                <span key={`${spec.label}-${index}`}>
                  {index > 0 ? " · " : null}
                  <span className="font-semibold text-navy-900">{spec.label}</span> {spec.value}
                </span>
              ))}
              {snapshot.moq != null ? (
                <span>
                  {snapshot.specs.length ? " · " : null}
                  <span className="font-semibold text-navy-900">MOQ</span> {snapshot.moq}
                </span>
              ) : null}
            </p>
          ) : null}
        {snapshot.leadLabels.length ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-n-600">
            {snapshot.leadLabels.map((lead) => (
              <span key={lead.mode} className="inline-flex items-center gap-1">
                {lead.mode === "air" ? (
                  <Plane className="size-[12px] text-n-500" strokeWidth={1.75} />
                ) : lead.mode === "sea" ? (
                  <Ship className="size-[12px] text-n-500" strokeWidth={1.75} />
                ) : (
                  <RushChip />
                )}
                {lead.label}
              </span>
            ))}
          </p>
        ) : null}
        </div>
        <ProposalPricing snapshot={snapshot} />
        {readOnly ? null : (
          <button
            type="button"
            aria-label={`Remove ${snapshot.name} from this proposal`}
            onClick={() => onRemove?.(item.id)}
            className="mt-1 inline-flex size-7 items-center justify-center rounded-full text-n-500 hover:bg-n-100 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The ONE proposal page body. The staff editor renders it with handles,
 * remove buttons and a toolbar; /p/{token} renders the identical markup in
 * read-only mode from frozen snapshots.
 */
export function ProposalDocument({
  header,
  items,
  readOnly = false,
  toolbar,
  onRemove,
  onReorder,
  onAdd,
  footer,
}: {
  header: ProposalHeader;
  items: ProposalDisplayItem[];
  readOnly?: boolean;
  toolbar?: React.ReactNode;
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

  const chip = "rounded-full border border-n-200 px-2.5 py-0.5 text-[11px] text-n-600";

  return (
    <div className="proposal-doc">
      <header className="proposal-print-header flex flex-wrap items-start justify-between gap-4 border-b border-n-200 pb-4">
        <div className="min-w-0">
          <p className="card-label">
            Proposal · {header.status === "generated" ? "Generated" : "Draft"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-navy-900">
            {header.clientName}{" "}
            <span className="font-medium text-n-500">— {header.projectName}</span>
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-navy-900 px-2.5 py-0.5 font-bold uppercase tracking-[0.1em] text-white">
              {header.incoterm} {CURRENCY_TAG[header.currency]}
            </span>
            <span className={chip}>{INCOTERM_SCOPE[header.incoterm]}</span>
            <span className={chip}>{formatProposalDate(header.dateISO)}</span>
            {header.preparedBy ? (
              <span className={chip}>Prepared by {header.preparedBy}</span>
            ) : null}
            <span className={chip}>
              {header.itemCount} item{header.itemCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        {toolbar ? <div className="proposal-no-print">{toolbar}</div> : null}
      </header>

      <div className="mt-2">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No items on this proposal yet.
          </p>
        ) : (
          items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
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
          ))
        )}
      </div>

      {readOnly ? null : (
        <button
          type="button"
          onClick={onAdd}
          className="proposal-no-print mt-4 w-full rounded-xl border border-dashed border-n-300 py-4 text-sm font-semibold text-navy-700 hover:border-lime-500 hover:bg-lime-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
        >
          ＋ Add items from the catalogue
        </button>
      )}

      <div className="mt-6 flex flex-wrap items-start gap-2 border-t border-n-200 pt-4 text-[11px] text-n-600">
        <Info className="mt-[1px] size-3.5 shrink-0 text-n-500" />
        <span>{PROPOSAL_FOOTER[header.incoterm]}</span>
      </div>
      {footer}
    </div>
  );
}