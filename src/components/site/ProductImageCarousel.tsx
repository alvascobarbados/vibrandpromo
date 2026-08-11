import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PRODUCT_FALLBACK_IMAGE } from "@/lib/catalog";

export function ProductImageCarousel({
  images,
  alt,
  children,
}: {
  images: string[];
  alt: string;
  children?: React.ReactNode;
}) {
  const list = images.length > 0 ? images : [PRODUCT_FALLBACK_IMAGE];
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<number[]>([0]);

  const markLoaded = useCallback((i: number) => {
    setLoaded((prev) => (prev.includes(i) ? prev : [...prev, i]));
  }, []);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = node.clientWidth || 1;
        const next = Math.round(node.scrollLeft / width);
        setIndex(next);
        markLoaded(next);
        markLoaded(next + 1);
      });
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", onScroll);
    };
  }, [markLoaded]);

  const goTo = (next: number) => {
    const node = trackRef.current;
    if (!node) return;
    const clamped = Math.max(0, Math.min(list.length - 1, next));
    markLoaded(clamped);
    node.scrollTo({ left: clamped * node.clientWidth, behavior: "smooth" });
  };

  const multiple = list.length > 1;

  return (
    <div className="group relative aspect-square overflow-hidden bg-muted">
      <div
        ref={trackRef}
        className={`flex size-full snap-x snap-mandatory scroll-smooth ${
          multiple ? "overflow-x-auto" : "overflow-hidden"
        } overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        style={{ touchAction: "pan-y pinch-zoom" }}
      >
        {list.map((src, i) => (
          <div key={`${src}-${i}`} className="relative size-full shrink-0 snap-start">
            {loaded.includes(i) ? (
              <img
                src={src}
                alt={i === 0 ? alt : `${alt} — image ${i + 1}`}
                loading={i === 0 ? "lazy" : "lazy"}
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full bg-muted" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      {multiple ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="absolute left-1.5 top-1/2 hidden -translate-y-1/2 rounded-full bg-background/80 p-1 text-foreground shadow-card opacity-0 transition-opacity hover:bg-background disabled:opacity-0 group-hover:opacity-100 sm:block"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => goTo(index + 1)}
            disabled={index === list.length - 1}
            className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-full bg-background/80 p-1 text-foreground shadow-card opacity-0 transition-opacity hover:bg-background disabled:opacity-0 group-hover:opacity-100 sm:block"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {list.map((src, i) => (
              <span
                key={`dot-${src}-${i}`}
                className={`size-1.5 rounded-full transition-colors ${
                  i === index ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}

      {children}
    </div>
  );
}