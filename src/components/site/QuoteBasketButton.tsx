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
      className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-n-700/10"
    >
      <ShoppingBag className="size-5 text-n-700" />
      {count > 0 ? (
        <span
          className={`absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-navy-700 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white ${
            animating ? "animate-badge-bounce" : ""
          }`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
