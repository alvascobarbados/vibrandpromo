import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/staff.functions";

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

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/bulk-images": "Bulk Images",
  "/admin/import": "Import Products",
  "/admin/quotes": "Quote Requests",
  "/admin/contacts": "Contacts",
  "/admin/email": "Email",
  "/admin/shipping": "Shipping Times",
  "/admin/staff": "Staff",
  "/admin/account": "My Account",
};

const COLLAPSE_KEY = "vibrand.admin.sidebar.collapsed";

function AdminLayout() {
  const { access } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const title = TITLES[pathname.replace(/\/$/, "") || "/admin"] ?? "Admin";

  return (
    <div className="min-h-screen bg-navy-50">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-navy-800 md:block ${
          collapsed ? "w-[4.5rem]" : "w-64"
        }`}
      >
        <AdminSidebar access={access} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-64 border-navy-800 bg-navy-900 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminSidebar
            access={access}
            collapsed={false}
            onToggleCollapsed={toggleCollapsed}
            onNavigate={() => setDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className={`flex min-h-screen flex-col ${collapsed ? "md:pl-[4.5rem]" : "md:pl-64"}`}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-n-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-1.5 text-n-500 hover:bg-navy-50 md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="truncate font-display text-lg font-bold text-n-900">{title}</h1>
        </header>
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
