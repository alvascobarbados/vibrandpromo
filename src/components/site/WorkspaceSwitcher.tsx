import { Link } from "@tanstack/react-router";

/** Staff-only workspace segments. Each workspace is a route, never hidden state. */
export type Workspace = "customer" | "supplier" | "admin";

const SEGMENTS = [
  { key: "customer", label: "Customer", to: "/" },
  { key: "supplier", label: "Supplier", to: "/team" },
  { key: "admin", label: "Admin", to: "/admin" },
] as const;

export function WorkspaceSwitcher({ current }: { current: Workspace }) {
  return (
    <div
      role="navigation"
      aria-label="Workspace switcher"
      className="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5"
    >
      {SEGMENTS.map((segment) => {
        const active = segment.key === current;
        return (
          <Link
            key={segment.key}
            to={segment.to}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              active ? "bg-lime-500 text-n-900" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {segment.label}
          </Link>
        );
      })}
    </div>
  );
}