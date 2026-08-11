import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  LogOut,
  Package,
  Tags,
  ClipboardList,
  FileSpreadsheet,
  ImageUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/staff.functions";
import logoMark from "@/assets/vibrand-mark.png";
import { Users, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const access = await getMyAccess();
    if (!access.isStaff) throw redirect({ to: "/" });

    return { user: data.user, access };
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/quotes", label: "Quote requests", icon: ClipboardList },
  { to: "/admin/import", label: "Import products", icon: FileSpreadsheet },
  { to: "/admin/bulk-images", label: "Bulk images", icon: ImageUp },
  { to: "/admin/staff", label: "Staff", icon: Users, adminOnly: true },
  { to: "/admin/account", label: "My account", icon: UserCog },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { access } = Route.useRouteContext();
  const nav = NAV.filter((item) => !("adminOnly" in item && item.adminOnly) || access.isAdmin);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b border-white/10 bg-charcoal text-charcoal-foreground">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <img src={logoMark} alt="Vibrand" className="h-7 w-auto" />
            <span>Admin</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-white/30 bg-transparent text-charcoal-foreground hover:bg-white/10 hover:text-charcoal-foreground"
            onClick={signOut}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/admin" }}
              activeProps={{ className: "bg-lime text-lime-foreground" }}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal-foreground/70 transition-colors hover:text-charcoal-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}