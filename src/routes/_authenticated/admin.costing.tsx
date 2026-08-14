import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { requirePage } from "@/lib/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/costing")({
  beforeLoad: ({ context }) => requirePage(context.access, "products"),
  component: CostingLayout,
});

const TABS = [
  { to: "/admin/costing/rates", label: "Rates & factors" },
  { to: "/admin/costing/routes", label: "Shipping routes" },
  { to: "/admin/costing/destinations", label: "Destinations" },
  { to: "/admin/costing/rounding", label: "Rounding" },
  { to: "/admin/costing/labels", label: "Detail labels" },
] as const;

function CostingLayout() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Commercial costing data — staff only. Changes save as you leave each field.
      </p>
      <nav className="mt-4 flex flex-wrap gap-1 border-b border-n-200 pb-2">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeProps={{ className: "bg-navy-900 text-white hover:bg-navy-900" }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-n-700 transition-colors hover:bg-navy-50"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="pt-5">
        <Outlet />
      </div>
    </div>
  );
}
