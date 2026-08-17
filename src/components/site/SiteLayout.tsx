import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, Mail, Phone, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { QuoteBasketButton } from "@/components/site/QuoteBasketButton";
import { QuoteDrawer } from "@/components/site/QuoteDrawer";
import { AccountMenu } from "@/components/site/AccountMenu";
import { AdminEditBar } from "@/components/site/AdminEditBar";
import { useStaffSession } from "@/lib/staff-session";
import { ViewModeProvider } from "@/lib/view-mode";
import { categoriesQuery } from "@/lib/catalog";
import { COMPANY } from "@/lib/territories";
import wordmarkCharcoal from "@/assets/wordmark-charcoal.png";
import wordmarkLime from "@/assets/wordmark-lime.png";
import markCharcoal from "@/assets/mark-charcoal.png";
import markLime from "@/assets/mark-lime.png";

/**
 * Workspace presentation seam. "customer" is the public site; "supplier" is the
 * staff-only /team workspace. Today it only flips branding — supplier-specific
 * UI (cost fields, margin tools) will hang off this prop later.
 */
export type ViewMode = "customer" | "supplier";


const NAV = [
  { to: "/", label: "Categories" },
  { to: "/products", label: "All Products" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
] as const;

function Logo({ viewMode }: { viewMode: ViewMode }) {
  const supplier = viewMode === "supplier";
  return (
    <Link
      to={supplier ? "/team" : "/"}
      search={{}}
      aria-label={supplier ? "Vibrand Supplier — full catalogue" : "Vibrand — full catalogue"}
      className="flex items-center gap-2"
    >
      <img
        src={supplier ? markLime : markCharcoal}
        alt="Vibrand"
        className="h-8 w-auto sm:hidden"
      />
      <img
        src={supplier ? wordmarkLime : wordmarkCharcoal}
        alt="Vibrand"
        className="hidden h-8 w-auto sm:block"
      />
      {supplier ? (
        <span className="mb-[3px] self-end rounded-[5px] bg-lime-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-navy-900">
          Supplier
        </span>
      ) : null}
    </Link>
  );
}

function HeaderSearch() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const urlQuery = useRouterState({
    select: (state) => ((state.location.search as { q?: string }).q ?? ""),
  });
  const [value, setValue] = useState(urlQuery);
  const [isNarrow, setIsNarrow] = useState(true);

  useEffect(() => setValue(urlQuery), [urlQuery]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 420px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          void navigate({
            to: "/products",
            search: (prev: Record<string, unknown>) => ({ ...prev, q: next, page: 1 }),
            replace: pathname === "/products",
            resetScroll: false,
          });
        }}
        placeholder={isNarrow ? "Search" : "Product name / SKU"}
        aria-label="Search products by name or SKU"
        className="h-10 w-full min-w-0 rounded-full border-transparent bg-white pl-9 text-n-700 placeholder:text-n-500 focus-visible:ring-2 focus-visible:ring-lime-500"
      />
    </div>
  );
}

export function SiteLayout({
  children,
  headerSlot,
  viewMode = "customer",
}: {
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  viewMode?: ViewMode;
}) {
  const supplier = viewMode === "supplier";
  const [open, setOpen] = useState(false);
  const categories = useQuery(categoriesQuery);
  const { isStaff } = useStaffSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        className={`sticky top-0 z-40 border-b ${
          supplier ? "border-black/20 bg-n-700" : "border-lime-700/20 bg-lime-500"
        }`}
      >
        <div className="site-container">
          <div className="flex h-16 flex-nowrap items-center gap-2 sm:gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className={
                  supplier
                    ? "shrink-0 text-white hover:bg-white/10 hover:text-white"
                    : "shrink-0 text-n-700 hover:bg-n-700/10 hover:text-n-700"
                }
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 overflow-y-auto">
              <nav className="mt-10 flex flex-col gap-1 pb-10">
                <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Categories
                </p>
                {(categories.data ?? []).map((category) => (
                  <Link
                    key={category.id}
                    to="/c/$slug"
                    params={{ slug: category.slug }}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {category.name}
                  </Link>
                ))}
                <div className="my-2 border-t border-border" />
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/quote"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                >
                  Quote List
                </Link>
                {isStaff ? (
                  <>
                    <div className="my-2 border-t border-border" />
                    <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Staff
                    </p>
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-3 text-base font-semibold text-foreground hover:bg-muted"
                    >
                      Admin
                    </Link>
                  </>
                ) : null}
              </nav>
            </SheetContent>
            </Sheet>
            <div className="shrink-0">
              <Logo viewMode={viewMode} />
            </div>
            <div className="min-w-0 flex-1">{headerSlot ?? <HeaderSearch />}</div>
            <div className="shrink-0">
              <QuoteBasketButton tone={supplier ? "light" : "dark"} />
            </div>
            <div className="shrink-0">
              <AccountMenu tone={supplier ? "light" : "dark"} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <ViewModeProvider mode={viewMode}>{children}</ViewModeProvider>
      </main>

      <AdminEditBar workspace={viewMode} />

      {supplier ? null : <QuoteDrawer />}

      <footer className="border-t border-navy-800 bg-navy-900 text-white">
        <div className="site-container grid gap-10 py-10 md:grid-cols-3 lg:py-16">
          <div>
            <img src={markLime} alt="Vibrand" className="h-10 w-auto" />
            <p className="mt-3 max-w-sm text-sm text-navy-100">
              Premium promotional products for businesses across 24 Caribbean territories.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white">Explore</p>
            <ul className="mt-4 space-y-2 text-sm text-navy-100">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/quote" className="hover:text-white">
                  Request a Quote
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white">Get in touch</p>
            <ul className="mt-4 space-y-3 text-sm text-navy-100">
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-lime-500" /> {COMPANY.email}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-lime-500" /> {COMPANY.phone}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-lime-500" /> {COMPANY.location}
              </li>
              <li className="text-navy-300">{COMPANY.hours}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-navy-800">
          <div className="site-container flex flex-col gap-2 py-6 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {COMPANY.name} All rights reserved.</p>
            <Link to="/auth" className="hover:text-white">
              Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
