import { SOURCE_SEGMENTS, type SourceScope } from "@/lib/use-catalog-filters";

/** Layer-1 scope control: one shared state, rendered on two surfaces. */
export function SourceScopeToggle({
  value,
  onChange,
  tone = "light",
}: {
  value: SourceScope;
  onChange: (next: SourceScope) => void;
  tone?: "light" | "dark";
}) {
  return (
    <div
      role="group"
      aria-label="Inventory source scope"
      className={`flex items-center gap-0.5 rounded-full p-0.5 ${
        tone === "dark" ? "bg-white/10" : "bg-n-100"
      }`}
    >
      {SOURCE_SEGMENTS.map((segment) => {
        const active = value === segment.value;
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(segment.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors duration-[150ms] ease-out ${
              active
                ? "bg-lime-500 text-n-700"
                : tone === "dark"
                  ? "text-white/80 hover:text-white"
                  : "text-n-700 hover:bg-white"
            }`}
          >
            {segment.dot ? (
              <span className={`size-1.5 shrink-0 rounded-full ${segment.dot}`} />
            ) : null}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
