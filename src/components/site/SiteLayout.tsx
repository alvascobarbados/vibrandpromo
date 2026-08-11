import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, Mail, Phone, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { QuoteBasketButton } from "@/components/site/QuoteBasketButton";
import { categoriesQuery } from "@/lib/catalog";
import { COMPANY } from "@/lib/territories";
import logoHorizontalWhite from "@/assets/vibrand-logo-white.png";
import logoMark from "@/assets/vibrand-mark.png";

const NAV = [
  { to: "/", label: "Categories" },
  { to: "/products", label: "All Products" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
] as const;

function Logo() {
  return (
    <Link to="/" search={{}} aria-label="Vibrand — full catalogue" className="flex items-center">
      <img src={logoMark} alt="Vibrand" className="h-8 w-auto sm:hidden" />
      <img src={logoHorizontalWhite} alt="Vibrand" className="hidden h-8 w-auto sm:block" />
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
        className="h-10 w-full min-w-0 rounded-full border-transparent bg-white pl-9 text-charcoal placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-lime"
      />
    </div>
  );
}

export function SiteLayout({
  children,
  headerSlot,
}: {
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const categories = useQuery(categoriesQuery);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-charcoal">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 flex-nowrap items-center gap-3 sm:gap-4">
            <div className="shrink-0">
              <Logo />
            </div>
            <div className="min-w-0 flex-1">{headerSlot ?? <HeaderSearch />}</div>
            <div className="shrink-0">
              <QuoteBasketButton />
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="shrink-0 text-charcoal-foreground hover:bg-white/10 hover:text-charcoal-foreground"
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
              </nav>
            </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-charcoal text-charcoal-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div>
            <img src={logoMark} alt="Vibrand" className="h-10 w-auto" />
            <p className="mt-3 max-w-sm text-sm text-charcoal-foreground/70">
              Premium promotional products for businesses across 24 Caribbean territories.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-lime">Explore</p>
            <ul className="mt-4 space-y-2 text-sm text-charcoal-foreground/75">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-lime">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/quote" className="hover:text-lime">
                  Request a Quote
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-lime">Get in touch</p>
            <ul className="mt-4 space-y-3 text-sm text-charcoal-foreground/75">
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-lime" /> {COMPANY.email}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-lime" /> {COMPANY.phone}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-lime" /> {COMPANY.location}
              </li>
              <li className="text-charcoal-foreground/55">{COMPANY.hours}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-charcoal-foreground/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} {COMPANY.name} All rights reserved.</p>
            <Link to="/auth" className="hover:text-lime">
              Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
