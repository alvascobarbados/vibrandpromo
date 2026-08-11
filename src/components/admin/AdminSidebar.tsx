import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  ImageUp,
  LayoutDashboard,
  LogOut,
  Package,
  Tags,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { quoteRequestsQuery } from "@/lib/admin";
import { canUsePage, type AdminPageKey } from "@/lib/page-access";
import type { MyAccess } from "@/lib/staff.functions";
import logoMark from "@/assets/vibrand-mark.png";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  page?: AdminPageKey;
  adminOnly?: boolean;
  exact?: boolean;
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Catalog",
    items: [
      { to: "/admin/products", label: "Products", icon: Package, page: "products" },
      { to: "/admin/categories", label: "Categories", icon: Tags, page: "categories" },
      { to: "/admin/bulk-images", label: "Bulk Images", icon: ImageUp, page: "bulk_images" },
      { to: "/admin/import", label: "Import", icon: FileSpreadsheet, page: "import" },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/admin/quotes", label: "Quote Requests", icon: ClipboardList, page: "quotes" },
    ],
  },
  {
    label: "Admin",
    items: [{ to: "/admin/staff", label: "Staff", icon: Users, adminOnly: true }],
  },
];

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export function AdminSidebar({
  access,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: {
  access: MyAccess;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const quotes = useQuery({ ...quoteRequestsQuery, enabled: canUsePage(access, "quotes") });
  const newQuotes = (quotes.data ?? []).filter((quote) => quote.status === "new").length;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.adminOnly && !access.isAdmin) return false;
      if (item.page && !canUsePage(access, item.page)) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col bg-charcoal text-charcoal-foreground">
        <div className="flex items-center gap-2 px-3 py-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 font-display text-base font-bold"
            onClick={onNavigate}
          >
            <img src={logoMark} alt="Vibrand" className="h-7 w-auto shrink-0" />
            {collapsed ? null : <span className="truncate">Admin</span>}
          </Link>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapsed}
            className="ml-auto hidden shrink-0 rounded-lg p-1.5 text-charcoal-foreground/60 transition-colors hover:bg-white/10 hover:text-charcoal-foreground md:block"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
          {groups.map((group) => (
            <div key={group.label}>
              {collapsed ? (
                <div className="mx-3 mb-2 h-px bg-white/10" />
              ) : (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-charcoal-foreground/40">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const badge = item.page === "quotes" && newQuotes > 0 ? newQuotes : null;
                  const link = (
                    <Link
                      to={item.to}
                      activeOptions={{ exact: item.exact ?? false }}
                      activeProps={{ className: "bg-lime text-lime-foreground" }}
                      onClick={onNavigate}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium text-charcoal-foreground/70 transition-colors hover:bg-white/10 hover:text-charcoal-foreground ${
                        collapsed ? "justify-center gap-0" : "gap-3"
                      }`}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {collapsed ? null : <span className="truncate">{item.label}</span>}
                      {badge && !collapsed ? (
                        <span className="ml-auto rounded-full bg-lime px-2 py-0.5 text-xs font-bold text-lime-foreground">
                          {badge}
                        </span>
                      ) : null}
                      {badge && collapsed ? (
                        <span className="absolute right-1 top-1 size-2 rounded-full bg-lime" />
                      ) : null}
                    </Link>
                  );
                  return (
                    <li key={item.to} className="relative">
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">
                            {item.label}
                            {badge ? ` (${badge} new)` : ""}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-2 py-3">
          <div
            className={`flex items-center gap-3 px-1 pb-3 ${collapsed ? "justify-center" : ""}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-lime-foreground">
              {initials(access.displayName, access.email)}
            </span>
            {collapsed ? null : (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {access.displayName || access.email}
                </p>
                <p className="text-xs capitalize text-charcoal-foreground/50">
                  {access.isAdmin ? "Admin" : "Staff"}
                </p>
              </div>
            )}
          </div>

          <Link
            to="/admin/account"
            onClick={onNavigate}
            activeProps={{ className: "bg-lime text-lime-foreground" }}
            className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium text-charcoal-foreground/70 transition-colors hover:bg-white/10 hover:text-charcoal-foreground ${
              collapsed ? "justify-center" : "gap-3"
            }`}
          >
            <UserCog className="size-4 shrink-0" />
            {collapsed ? null : "My Account"}
          </Link>

          <Button
            variant="ghost"
            onClick={signOut}
            className={`mt-1 w-full text-charcoal-foreground/70 hover:bg-white/10 hover:text-charcoal-foreground ${
              collapsed ? "justify-center px-0" : "justify-start gap-3 px-3"
            }`}
          >
            <LogOut className="size-4 shrink-0" />
            {collapsed ? null : "Sign out"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}