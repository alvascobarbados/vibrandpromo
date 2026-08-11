import { Link } from "@tanstack/react-router";
import { Menu, Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { QuoteBasketButton } from "@/components/site/QuoteBasketButton";
import { COMPANY } from "@/lib/territories";
import logoHorizontal from "@/assets/vibrand-logo.png";
import logoMark from "@/assets/vibrand-mark.png";

const NAV = [
  { to: "/", label: "Catalogue" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
] as const;

function Logo() {
  return (
    <Link to="/" search={{}} aria-label="Vibrand — full catalogue" className="flex items-center">
      <img src={logoMark} alt="Vibrand" className="h-8 w-auto sm:hidden" />
      <img src={logoHorizontal} alt="Vibrand" className="hidden h-8 w-auto sm:block" />
    </Link>
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 flex-nowrap items-center gap-3 sm:gap-4">
            <div className="shrink-0">
              <Logo />
            </div>
            {headerSlot ? (
              <div className="min-w-0 flex-1">{headerSlot}</div>
            ) : (
              <div className="flex-1" />
            )}
            <div className="shrink-0">
              <QuoteBasketButton />
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="shrink-0">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-10 flex flex-col gap-1">
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
            <p className="font-display text-2xl font-bold">Vibrand</p>
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
