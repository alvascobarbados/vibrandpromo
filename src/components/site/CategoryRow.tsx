import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/lib/catalog";

const CARD_WIDTH =
  "w-[calc((100%-1.5rem)/2.1)] sm:w-[calc((100%-2.25rem)/3.3)] xl:w-[calc((100%-3rem)/4.3)]";

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

  const update = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.clientWidth ?? node.clientWidth / 2;
    const gap = 12;
    const lastVisible = Math.ceil((node.scrollLeft + node.clientWidth) / (cardWidth + gap));
    setRenderCount((prev) => Math.max(prev, lastVisible + 2));
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

  return (
    <div
      ref={trackRef}
      className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-4 pb-1 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
          className={`flex shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-charcoal/40 bg-card px-3 text-center text-xs font-bold uppercase tracking-wide text-charcoal transition-colors hover:bg-muted ${CARD_WIDTH}`}
        >
          <ArrowRight className="size-5" />
          View all {total}
        </Link>
      ) : null}
    </div>
  );
}
