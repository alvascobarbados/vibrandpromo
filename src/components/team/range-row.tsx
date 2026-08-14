/**
 * ONE range renderer for the /team card — LEAD TIME and RUSH read identically.
 *
 * Fixed gaps on both sides of the dash mean the dash is always dead-centred and
 * an empty side renders as a standalone em dash: "15 – 20 days", "20 – —",
 * "— – — · off". No glued "–—" clusters, ever.
 */
import { InlineField } from "@/components/team/inline-field";

export function RangeRow({
  min,
  max,
  saveMin,
  saveMax,
  suffix,
}: {
  min: string;
  max: string;
  saveMin: (raw: string) => Promise<void>;
  saveMax: (raw: string) => Promise<void>;
  suffix: string;
}) {
  return (
    <span className="flex flex-nowrap items-center gap-1.5">
      <InlineField className="w-9 shrink-0" value={min} numeric save={saveMin} />
      <span className="shrink-0 text-[11px] leading-none text-muted-foreground">–</span>
      <InlineField className="w-9 shrink-0" value={max} numeric save={saveMax} />
      <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">{suffix}</span>
    </span>
  );
}
