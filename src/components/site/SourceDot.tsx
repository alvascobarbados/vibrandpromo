/** Small colour dot for an inventory source, matching the card flag badges. */
export function SourceDot({ source }: { source: string }) {
  const usa = source === "USA Inventory";
  return (
    <span
      aria-hidden
      className={`size-2 shrink-0 rounded-full ${usa ? "bg-source-usa" : "bg-source-factory"}`}
    />
  );
}
