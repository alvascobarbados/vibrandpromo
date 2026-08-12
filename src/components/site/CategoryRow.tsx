import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/lib/catalog";

const CARD_WIDTH =
  "w-[calc((100%-1.5rem)/2.1)] sm:w-[228px] md:w-[240px] lg:w-[252px] xl:w-[264px]";

export function CategoryRow({
  items,
  total,
  categorySlug,
}: {
  items: Product[];
  total: number;
  categorySlug: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [renderCount, setRenderCount] = useState(4);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.clientWidth ?? node.clientWidth / 2;
    const gap = 12;
    const lastVisible = Math.ceil((node.scrollLeft + node.clientWidth) / (cardWidth + gap));
    setRenderCount((prev) => Math.max(prev, lastVisible + 2));
    setAtStart(node.scrollLeft <= 4);
    setAtEnd(node.scrollLeft + node.clientWidth >= node.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const node = trackRef.current;
    if (!node) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", onScroll);
    };
  }, [update]);

  const page = (direction: -1 | 1) => {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="group/shelf relative">
      <div
        ref={trackRef}
        className="site-scroller flex snap-x snap-mandatory items-stretch gap-3 overflow-y-hidden scroll-smooth pb-1 md:gap-5 lg:gap-6"
        style={{ touchAction: "pan-x pan-y pinch-zoom", overscrollBehaviorX: "contain" }}
      >
      {items.map((product, index) => (
        <div key={product.id} className={`shrink-0 snap-start ${CARD_WIDTH}`}>
          {index < renderCount ? (
            <ProductCard product={product} coverOnly />
          ) : (
            <div className="h-full rounded-2xl border border-border bg-muted/40" />
          )}
        </div>
      ))}

      {total > items.length ? (
        <Link
          to="/c/$slug"
          params={{ slug: categorySlug }}
          className={`flex shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-300 bg-white px-3 text-center text-xs font-bold uppercase tracking-wide text-navy-700 transition-colors hover:bg-navy-50 ${CARD_WIDTH}`}
        >
          <ArrowRight className="size-5" />
          View all {total}
        </Link>
      ) : null}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between [@media(hover:hover)]:flex">
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => page(-1)}
          className={`pointer-events-auto -ml-3 inline-flex size-9 items-center justify-center rounded-full bg-n-700 text-white shadow-card transition-opacity duration-[180ms] ease-out group-hover/shelf:opacity-100 ${
            atStart ? "opacity-0" : "opacity-0"
          }`}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => page(1)}
          className={`pointer-events-auto -mr-3 inline-flex size-9 items-center justify-center rounded-full bg-n-700 text-white shadow-card transition-opacity duration-[180ms] ease-out group-hover/shelf:opacity-100 ${
            atEnd ? "opacity-0" : "opacity-0"
          }`}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
