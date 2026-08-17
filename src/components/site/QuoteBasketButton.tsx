import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { useQuoteList } from "@/lib/quote-list";

export function QuoteBasketButton({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { count, bump, openDrawer } = useQuoteList();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!bump) return;
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 480);
    return () => clearTimeout(timer);
  }, [bump]);

  const className = `relative inline-flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lime-500 ${
    tone === "light" ? "hover:bg-white/10" : "hover:bg-n-700/10"
  }`;
  const label = `Open quote list (${count} items)`;

  const inner = (
    <>
      <ShoppingBag className={`size-5 ${tone === "light" ? "text-white" : "text-n-700"}`} />
      {count > 0 ? (
        <span
          className={`absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-navy-700 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white ${
            animating ? "animate-badge-bounce" : ""
          }`}
        >
          {count}
        </span>
      ) : null}
    </>
  );

  // On the full quote page the icon stays a plain link — no drawer over the page.
  if (pathname === "/quote") {
    return (
      <Link to="/quote" aria-label={label} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => openDrawer()} aria-label={label} className={className}>
      {inner}
    </button>
  );
}
