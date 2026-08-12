/**
 * "RUSH" chip used in place of an icon on the rush lead-time row.
 * Lime background, charcoal text. Sizing responds to the card container query
 * (same 200px breakpoint the spec row uses); `size="static"` keeps a fixed
 * 10px size for non-card surfaces (admin previews).
 */
export function RushChip({ size = "responsive" }: { size?: "responsive" | "static" }) {
  const sizing =
    size === "static"
      ? "text-[10px] px-1.5 py-[2px]"
      : "text-[9px] px-[5px] py-[2px] [@container(min-width:200px)]:text-[10px] [@container(min-width:200px)]:px-1.5";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[4px] bg-lime-500 font-semibold leading-none tracking-[0.02em] text-n-700 ${sizing}`}
    >
      RUSH
    </span>
  );
}
