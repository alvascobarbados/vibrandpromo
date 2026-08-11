import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

import { useQuoteList } from "@/lib/quote-list";

export function QuoteFab() {
  const { count } = useQuoteList();

  return (
    <Link
      to="/quote"
      aria-label={`Open quote list (${count} items)`}
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full border border-border bg-card shadow-lift transition-transform hover:scale-105"
    >
      <ShoppingBag className="size-6 text-charcoal" />
      <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
        {count}
      </span>
    </Link>
  );
}
