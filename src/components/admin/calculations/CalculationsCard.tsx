/**
 * CalculationsCard — one wide horizontal card per product, ported from V3-1.
 *
 * Identity → Specs → Product Costs → [FOB] → Transport → [CIF] → LAC →
 * [LDF] → Duty → [LDP]. Blocks in [brackets] are amber outputs; the rest are
 * white workings. Route bubbles render in a stable global order so the table
 * structure never shifts per product.
 *
 * Display only: every number comes from the engine (src/lib/calcEngine.ts).
 */
import { useMemo } from "react";

import { formatMoney, formatNumber } from "@/lib/formatMoney";
import {
  cheapestBbRouteForRow,
  computeProductCalc,
  type CalcRow,
  type RouteInput,
  type Settings,
} from "@/lib/calcEngine";
import type { CalcProduct } from "@/lib/calc-page";

const EM = "\u2014";

const AMBER_BG = "#FFFAF0";
const AMBER_BORDER = "#F2D9B2";
const AMBER_TEXT = "#6B4F2A";
const NAVY = "#0E2849";
const GRAY_BG = "#F3F4F6";
const SELECT_USD_BG = "#E5EAF1";
const SELECT_AMBER_BG = "#FEF3E2";
const BLOCK_BORDER = "0.5px solid #E5E7EB";
const BUBBLE_BORDER = "0.5px solid #E5E7EB";

const NUM_FONT: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

const BUBBLE_W = 196;
const ROW_H = 64;
const BUBBLE_GAP = 6;

const Tag = ({ children, kind }: { children: React.ReactNode; kind: "built" | "new" | "output" }) => (
  <span
    style={{
      background: kind === "built" ? "#DCFCE7" : "#FEF3E2",
      color: kind === "built" ? "#166534" : "#C2410C",
      fontSize: 9,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      padding: "1px 6px",
      borderRadius: 4,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const CurrencyBadge = ({ currency }: { currency: "USD" | "BBD" }) => (
  <span
    style={{
      background: currency === "USD" ? "#E5EAF1" : "#DBEAFE",
      color: currency === "USD" ? "#0E2849" : "#1E3A8A",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.05em",
      padding: "1px 5px",
      borderRadius: 4,
    }}
  >
    {currency}
  </span>
);

const ScopeBadge = () => (
  <span
    style={{
      background: "#FEF3E2",
      color: "#C2410C",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.05em",
      padding: "1px 5px",
      borderRadius: 4,
    }}
  >
    → BB
  </span>
);

const BlockHeader = ({
  title,
  currency,
  scopeBB,
  tag,
}: {
  title: string;
  currency: "USD" | "BBD";
  scopeBB?: boolean | undefined;
  tag: "built" | "new" | "output";
}) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, whiteSpace: "nowrap" }}
  >
    <span
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: NAVY,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {title}
    </span>
    <Tag kind={tag}>{tag}</Tag>
    <CurrencyBadge currency={currency} />
    {scopeBB ? <ScopeBadge /> : null}
  </div>
);

const RouteColumnHeader = ({ label }: { label: string }) => (
  <div
    style={{
      fontSize: 9,
      fontWeight: 700,
      color: "#6B7280",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      textAlign: "center",
      whiteSpace: "nowrap",
      padding: "0 4px 4px",
    }}
  >
    {label}
  </div>
);

const Bubble = ({
  children,
  amber,
  gray,
  selected,
  height = ROW_H,
}: {
  children: React.ReactNode;
  amber?: boolean;
  gray?: boolean;
  selected?: boolean;
  height?: number;
}) => {
  let bg = "#FFFFFF";
  let border = BUBBLE_BORDER;
  let color: string | undefined;
  if (gray) {
    bg = GRAY_BG;
    color = "#9CA3AF";
  } else if (amber) {
    bg = selected ? SELECT_AMBER_BG : AMBER_BG;
    border = `0.5px solid ${selected ? AMBER_TEXT : AMBER_BORDER}`;
    color = AMBER_TEXT;
  } else if (selected) {
    bg = SELECT_USD_BG;
    border = `0.5px solid ${NAVY}`;
  }
  return (
    <div
      style={{
        width: BUBBLE_W,
        height,
        background: bg,
        border,
        borderRadius: 6,
        padding: "6px 8px",
        color,
        fontSize: 14,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        ...NUM_FONT,
      }}
    >
      {children}
    </div>
  );
};

const Th = ({ children, align }: { children: React.ReactNode; align?: "right" }) => (
  <th style={{ padding: "2px 8px", fontWeight: 700, textAlign: align ?? "left", whiteSpace: "nowrap" }}>
    {children}
  </th>
);

const Td = ({
  children,
  align,
  bold,
}: {
  children: React.ReactNode;
  align?: "right";
  bold?: boolean;
}) => (
  <td
    style={{
      padding: "2px 8px",
      textAlign: align ?? "left",
      fontWeight: bold ? 600 : 400,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </td>
);

const OutputColumn = ({
  label,
  columns,
  children,
}: {
  label: string;
  columns: { id: string; label: string }[];
  children: React.ReactNode;
}) => (
  <div style={{ padding: "12px 14px", borderRight: BLOCK_BORDER, background: AMBER_BG, flexShrink: 0 }}>
    <BlockHeader title={label} currency="USD" tag="output" />
    <div style={{ display: "flex", gap: BUBBLE_GAP, marginBottom: 4 }}>
      {columns.map((column) => (
        <div key={column.id} style={{ width: BUBBLE_W }}>
          <RouteColumnHeader label={column.label} />
        </div>
      ))}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: BUBBLE_GAP }}>{children}</div>
  </div>
);

const RouteColumnBlock = ({
  title,
  tag,
  currency,
  scopeBB,
  isOutput,
  routes,
  rows,
  renderCell,
  rowHeight = ROW_H,
}: {
  title: string;
  tag: "new" | "output";
  currency: "USD" | "BBD";
  scopeBB?: boolean;
  isOutput?: boolean;
  routes: RouteInput[];
  rows: CalcRow[];
  renderCell: (row: CalcRow, route: RouteInput, rowIdx: number) => React.ReactNode;
  rowHeight?: number;
}) => (
  <div
    style={{
      padding: "12px 14px",
      borderRight: BLOCK_BORDER,
      background: isOutput ? AMBER_BG : "#FFFFFF",
      flexShrink: 0,
    }}
  >
    <BlockHeader title={title} currency={currency} tag={tag} scopeBB={scopeBB} />
    <div style={{ display: "flex", gap: BUBBLE_GAP, marginBottom: 4 }}>
      {routes.map((route) => (
        <div key={route.id} style={{ width: BUBBLE_W }}>
          <RouteColumnHeader label={route.code} />
        </div>
      ))}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: BUBBLE_GAP }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: BUBBLE_GAP, minHeight: rowHeight }}>
          {routes.map((route) => (
            <div key={route.id}>{renderCell(row, route, i)}</div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

function IdentityBlock({ entry }: { entry: CalcProduct }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRight: BLOCK_BORDER,
        minWidth: 240,
        maxWidth: 300,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#9CA3AF",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 2,
        }}
      >
        {entry.supplier?.code ?? EM} · {entry.product.sku ?? EM}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#18181B", lineHeight: 1.25 }}>
        {entry.product.name}
      </div>
      {entry.sourcing?.variant_label ? (
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
          {entry.sourcing.variant_label}
        </div>
      ) : null}
      {entry.sourcing?.supplier_item_no ? (
        <div
          style={{
            display: "inline-block",
            marginTop: 6,
            fontSize: 11,
            fontFamily: "monospace",
            color: "#6B7280",
            background: "#F3F4F6",
            padding: "1px 6px",
            borderRadius: 4,
          }}
        >
          {entry.sourcing.supplier_item_no}
        </div>
      ) : null}
    </div>
  );
}

function SpecsBlock({ entry }: { entry: CalcProduct }) {
  const product = entry.product;
  const sourcing = entry.sourcing;
  const input = entry.input;
  const lead =
    product.production_min_days == null
      ? EM
      : product.production_max_days == null
        ? `${product.production_min_days}d`
        : `${product.production_min_days}–${product.production_max_days}d`;
  const dimUnit = input?.dimensionUnit ?? "cm";
  const wtUnit = input?.weightUnit === "lb" ? "lbs" : "kg";
  const dims =
    sourcing?.carton_length != null && sourcing.carton_width != null && sourcing.carton_height != null
      ? `${sourcing.carton_length}×${sourcing.carton_width}×${sourcing.carton_height} ${dimUnit}`
      : EM;
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRight: BLOCK_BORDER,
        minWidth: 200,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: NAVY,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        Specs
      </div>
      <div style={{ fontSize: 13, color: "#374151", display: "grid", gap: 4 }}>
        <div>
          <span style={{ color: "#9CA3AF" }}>Origin </span>
          {entry.originCode ?? EM}
        </div>
        <div>
          <span style={{ color: "#9CA3AF" }}>Pcs/Ctn </span>
          {sourcing?.carton_pack ?? EM}
        </div>
        <div>
          <span style={{ color: "#9CA3AF" }}>Ctn </span>
          {dims}
        </div>
        <div>
          <span style={{ color: "#9CA3AF" }}>Wt </span>
          {sourcing?.carton_weight != null ? `${sourcing.carton_weight} ${wtUnit}` : EM}
        </div>
        <div>
          <span style={{ color: "#9CA3AF" }}>Lead </span>
          {lead}
        </div>
      </div>
    </div>
  );
}

function ImageBlock({ entry }: { entry: CalcProduct }) {
  const image = entry.product.images?.[0] ?? null;
  return (
    <div
      style={{
        width: 90,
        padding: 8,
        borderRight: BLOCK_BORDER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAFBFC",
        flexShrink: 0,
      }}
    >
      {image ? (
        <img
          src={image}
          alt={entry.product.name}
          loading="lazy"
          style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6 }}
        />
      ) : (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 6,
            background: "#F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#D1D5DB",
            fontSize: 10,
          }}
        >
          no img
        </div>
      )}
    </div>
  );
}

export function CalculationsCard({
  entry,
  routes,
  settings,
}: {
  entry: CalcProduct;
  routes: RouteInput[];
  settings: Settings;
}) {
  const productInput = entry.input;

  const calc = useMemo(
    () => (productInput ? computeProductCalc(productInput, routes, settings) : null),
    [productInput, routes, settings],
  );

  const orderedRoutes = useMemo(
    () => [...routes].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)),
    [routes],
  );
  const bbRoutes = useMemo(
    () => orderedRoutes.filter((route) => route.destination === "BB"),
    [orderedRoutes],
  );

  const selectedByRow = useMemo(() => {
    const out: Record<number, string | null> = {};
    calc?.rows.forEach((row, i) => {
      out[i] = cheapestBbRouteForRow(row, calc.bbRouteOrder);
    });
    return out;
  }, [calc]);

  // The engine is the single source of truth for "duty rate missing".
  const dutyUnset = useMemo(() => {
    if (!calc) return false;
    for (const row of calc.rows) {
      for (const id of calc.bbRouteOrder) {
        const cell = row.bbOutputs[id];
        if (cell && cell.active && cell.dutyMissing) return true;
      }
    }
    return false;
  }, [calc]);

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E5E7EB",
        borderRadius: 12,
        position: "relative",
        width: "max-content",
        minWidth: "100%",
      }}
    >
      {dutyUnset ? (
        <div
          role="alert"
          style={{
            padding: "6px 12px",
            background: "#FEF3C7",
            borderBottom: "0.5px solid #F2D9B2",
            color: "#92400E",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13 }}>⚠</span>
          Duty rate not set for “{entry.subcategoryName ?? "subcategory"}” — landed cost is computed
          with 0% duty and may be understated.
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "nowrap", alignItems: "stretch", width: "max-content" }}>
        <ImageBlock entry={entry} />
        <IdentityBlock entry={entry} />
        <SpecsBlock entry={entry} />

        {!calc ? (
          <div style={{ padding: 24, fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
            Missing data — set supplier origin, carton specs and at least one pricing band to see
            calculations.
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "12px 14px",
                borderRight: BLOCK_BORDER,
                background: "#fff",
                flexShrink: 0,
              }}
            >
              <BlockHeader title="Product Costs" currency="USD" tag="built" />
              <table style={{ borderCollapse: "collapse", fontSize: 14, ...NUM_FONT }}>
                <thead>
                  <tr
                    style={{
                      color: "#9CA3AF",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontSize: 11,
                    }}
                  >
                    <Th>Qty</Th>
                    <Th align="right">Unit</Th>
                    <Th align="right">Setup</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {calc.rows.map((row, i) => {
                    const tier = productInput!.pricingTiers[i]!;
                    return (
                      <tr key={i} style={{ height: ROW_H }}>
                        <Td>{row.spec.qty}</Td>
                        <Td align="right">{formatMoney({ amount: tier.unitUsd, currency: "USD" })}</Td>
                        <Td align="right">{formatMoney({ amount: tier.setupUsd, currency: "USD" })}</Td>
                        <Td align="right" bold>
                          {formatMoney(row.spec.productTotalUsd)}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <OutputColumn label="FOB" columns={[{ id: "all", label: "All routes" }]}>
              {calc.rows.map((row, i) => (
                <Bubble key={i} amber>
                  <div style={{ fontWeight: 600 }}>{formatMoney(row.spec.productTotalUsd)}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {formatMoney(row.spec.fobUnitUsd)} /u
                  </div>
                </Bubble>
              ))}
            </OutputColumn>

            <RouteColumnBlock
              title="Transportation Costs"
              tag="new"
              currency="USD"
              routes={orderedRoutes}
              rows={calc.rows}
              rowHeight={86}
              renderCell={(row, route, i) => {
                const cell = row.transports[route.id];
                if (!cell || !cell.active) {
                  const reason = cell && "reason" in cell ? cell.reason : "";
                  const isInvalid = reason === "invalid data";
                  return (
                    <Bubble gray={!isInvalid} amber={isInvalid}>
                      <div style={{ textAlign: "center" }}>{isInvalid ? "⚠" : EM}</div>
                      <div
                        style={{
                          fontSize: 11,
                          fontStyle: isInvalid ? "normal" : "italic",
                          textAlign: "center",
                          color: isInvalid ? "#92400E" : undefined,
                          fontWeight: isInvalid ? 600 : undefined,
                        }}
                      >
                        {reason}
                      </div>
                    </Bubble>
                  );
                }
                const tierLabel = cell.tier
                  ? `${formatNumber(cell.tier.from, 0)}–${
                      cell.tier.to == null ? "∞" : formatNumber(cell.tier.to, 0)
                    }`
                  : EM;
                const surchargeMul = (1 + route.fuelPct) * (1 + route.bufferPct);
                const surchargeStr = surchargeMul === 1 ? "" : ` × ${formatNumber(surchargeMul, 2)}`;
                const itcStr =
                  cell.itcUsd > 0
                    ? ` + ${formatMoney({ amount: cell.itcUsd, currency: "USD" })} ground`
                    : "";
                return (
                  <Bubble selected={selectedByRow[i] === route.id} amber={cell.itcMissing}>
                    <div
                      style={{
                        fontSize: 12,
                        color: cell.itcMissing ? "#92400E" : "#6B7280",
                        lineHeight: 1.3,
                      }}
                    >
                      {cell.itcMissing
                        ? "⚠ inland freight not set"
                        : `${formatNumber(cell.applied, 2)} ${route.chargeableUnit} · ${tierLabel} @ ${formatMoney(
                            { amount: cell.tier?.rateUsd ?? 0, currency: "USD" },
                          )}`}
                    </div>
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.3 }}>
                      ({formatMoney({ amount: route.baseFeeUsd ?? 0, currency: "USD" })} +{" "}
                      {formatMoney({ amount: cell.tierCostUsd, currency: "USD" })}
                      {itcStr}){surchargeStr} = <strong>{formatMoney(cell.transportUsd)}</strong>
                    </div>
                  </Bubble>
                );
              }}
            />

            <RouteColumnBlock
              title="CIF"
              tag="output"
              currency="USD"
              isOutput
              routes={orderedRoutes}
              rows={calc.rows}
              renderCell={(row, route, i) => {
                const cell = row.transports[route.id];
                if (!cell || !cell.active) {
                  return (
                    <Bubble gray>
                      <div style={{ textAlign: "center" }}>{EM}</div>
                    </Bubble>
                  );
                }
                return (
                  <Bubble amber selected={selectedByRow[i] === route.id}>
                    <div style={{ fontWeight: 600 }}>{formatMoney(cell.cifUsd)}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {formatMoney(cell.cifUnitUsd)} /u
                    </div>
                  </Bubble>
                );
              }}
            />

            {bbRoutes.length > 0 ? (
              <RouteColumnBlock
                title="Local Area Charges"
                tag="new"
                currency="BBD"
                scopeBB
                routes={bbRoutes}
                rows={calc.rows}
                rowHeight={68}
                renderCell={(row, route, i) => {
                  const cell = row.bbOutputs[route.id];
                  if (!cell || !cell.active) {
                    return (
                      <Bubble gray>
                        <div style={{ textAlign: "center" }}>{EM}</div>
                        <div style={{ fontSize: 11, fontStyle: "italic", textAlign: "center" }}>
                          {cell && "reason" in cell ? cell.reason : ""}
                        </div>
                      </Bubble>
                    );
                  }
                  return (
                    <Bubble selected={selectedByRow[i] === route.id}>
                      <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.3 }}>
                        {formatMoney({ amount: route.lacFixedBbd, currency: "BBD" })} +{" "}
                        {formatNumber(row.spec.totalCbm, 5)} ×{" "}
                        {formatMoney({ amount: route.lacPerCbmBbd, currency: "BBD" })}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{formatMoney(cell.lacBbd)}</div>
                    </Bubble>
                  );
                }}
              />
            ) : null}

            {bbRoutes.length > 0 ? (
              <RouteColumnBlock
                title="LDF"
                tag="output"
                currency="BBD"
                scopeBB
                isOutput
                routes={bbRoutes}
                rows={calc.rows}
                renderCell={(row, route, i) => {
                  const cell = row.bbOutputs[route.id];
                  if (!cell || !cell.active) {
                    return (
                      <Bubble gray>
                        <div style={{ textAlign: "center" }}>{EM}</div>
                      </Bubble>
                    );
                  }
                  return (
                    <Bubble amber selected={selectedByRow[i] === route.id}>
                      <div style={{ fontWeight: 600 }}>{formatMoney(cell.ldfBbd)}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {formatMoney(cell.ldfUnitBbd)} /u
                      </div>
                    </Bubble>
                  );
                }}
              />
            ) : null}

            {bbRoutes.length > 0 ? (
              <RouteColumnBlock
                title="Duties Cost"
                tag="new"
                currency="BBD"
                scopeBB
                routes={bbRoutes}
                rows={calc.rows}
                rowHeight={68}
                renderCell={(row, route, i) => {
                  const transport = row.transports[route.id];
                  const cell = row.bbOutputs[route.id];
                  if (!cell || !cell.active || !transport || !transport.active) {
                    return (
                      <Bubble gray>
                        <div style={{ textAlign: "center" }}>{EM}</div>
                      </Bubble>
                    );
                  }
                  return (
                    <Bubble selected={selectedByRow[i] === route.id} amber={cell.dutyMissing}>
                      <div
                        style={{
                          fontSize: 12,
                          color: cell.dutyMissing ? "#92400E" : "#6B7280",
                          lineHeight: 1.3,
                        }}
                      >
                        {cell.dutyMissing
                          ? "duty rate not set"
                          : `${formatMoney(transport.cifUsd)} × ${formatNumber(
                              settings.customsMultiplier,
                              1,
                            )} × ${formatNumber(settings.dvf, 2)} × ${formatNumber(
                              (productInput!.dutyRate ?? 0) * 100,
                              0,
                            )}%`}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{formatMoney(cell.dutyBbd)}</div>
                    </Bubble>
                  );
                }}
              />
            ) : null}

            {bbRoutes.length > 0 ? (
              <RouteColumnBlock
                title="LDP"
                tag="output"
                currency="BBD"
                scopeBB
                isOutput
                routes={bbRoutes}
                rows={calc.rows}
                renderCell={(row, route, i) => {
                  const cell = row.bbOutputs[route.id];
                  if (!cell || !cell.active) {
                    return (
                      <Bubble gray>
                        <div style={{ textAlign: "center" }}>{EM}</div>
                      </Bubble>
                    );
                  }
                  return (
                    <Bubble amber selected={selectedByRow[i] === route.id}>
                      <div style={{ fontWeight: 700 }}>{formatMoney(cell.ldpBbd)}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {formatMoney(cell.ldpUnitBbd)} /u
                      </div>
                    </Bubble>
                  );
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}