import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Rows3 } from "lucide-react";

export type CatalogView = "grid" | "expanded";

/** Reads the desktop layout choice straight from the URL (?view=expanded). */
export function useCatalogView(): CatalogView {
  const raw = useRouterState({
    select: (s) => (s.location.search as Record<string, unknown>)['view'] as unknown,
  }) as unknown;
  return raw === "expanded" ? "expanded" : "grid";
}

/**
 * Grid ↔ Expanded segmented control. Shared by the home/category desktop
 * catalogue and /products — one implementation, never copied. Switching the
 * layout keeps the current results page.
 */
export function ViewToggle() {
  const view = useCatalogView();
  const navigate = useNavigate();

  const set = (next: CatalogView) => {
    void navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, view: next }),
      replace: false,
      resetScroll: false,
    } as never);
  };

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-n-200 bg-white p-1"
      role="group"
      aria-label="Product layout"
    >
      {(
        [
          { value: "grid", label: "Grid", Icon: LayoutGrid },
          { value: "expanded", label: "Expanded", Icon: Rows3 },
        ] as const
      ).map(({ value, label, Icon }) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => set(value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
              active ? "bg-navy-900 text-white" : "text-n-600 hover:bg-navy-50 hover:text-navy-700"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}