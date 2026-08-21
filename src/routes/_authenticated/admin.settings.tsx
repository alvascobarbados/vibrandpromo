import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsLayout,
});

const TABS = [
  { to: "/admin/settings/email", label: "Email" },
  { to: "/admin/settings/shipping", label: "Shipping times" },
  { to: "/admin/settings/proposals", label: "Proposals" },
  { to: "/admin/settings/staff", label: "Staff" },
] as const;

function SettingsLayout() {
  return (
    <div>
      <nav className="flex flex-wrap gap-1 border-b border-n-200 pb-2">
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
