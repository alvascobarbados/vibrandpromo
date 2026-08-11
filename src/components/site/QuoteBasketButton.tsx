import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { useQuoteList } from "@/lib/quote-list";

export function QuoteBasketButton() {
  const { count, bump } = useQuoteList();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!bump) return;
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 480);
    return () => clearTimeout(timer);
  }, [bump]);

  return (
    <Link
      to="/quote"
      aria-label={`Open quote list (${count} items)`}
      className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted"
    >
      <ShoppingBag className="size-5 text-charcoal" />
      {count > 0 ? (
        <span
          className={`absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-lime px-1.5 py-0.5 text-[11px] font-bold leading-none text-lime-foreground ${
            animating ? "animate-badge-bounce" : ""
          }`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
