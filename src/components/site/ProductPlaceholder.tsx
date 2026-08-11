/** Clean placeholder tile for products that have no photography yet. */
export function ProductPlaceholder({
  className = "",
  variant = "tile",
}: {
  className?: string;
  variant?: "tile" | "dark";
}) {
  return (
    <div
      role="img"
      aria-label="Photo coming soon"
      className={`flex items-center justify-center ${
        variant === "dark" ? "bg-white/5" : "bg-muted"
      } ${className}`}
    >
      <span
        className={`select-none font-display text-[clamp(1.5rem,22%,6rem)] font-bold leading-none tracking-tight ${
          variant === "dark" ? "text-white/20" : "text-charcoal/15"
        }`}
      >
        V!
      </span>
    </div>
  );
}
