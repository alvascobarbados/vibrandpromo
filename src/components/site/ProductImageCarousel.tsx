import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductPlaceholder } from "@/components/site/ProductPlaceholder";
import { imageSrc } from "@/lib/catalog";

export function ProductImageCarousel({
  images,
  alt,
  children,
  onImageTap,
  coverOnly = false,
}: {
  images: string[];
  alt: string;
  children?: React.ReactNode;
  onImageTap?: (index: number) => void;
  coverOnly?: boolean;
}) {
  const list = images.map(imageSrc);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<number[]>([0]);
  const tapRef = useRef<{ x: number; y: number; scroll: number } | null>(null);

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

  if (list.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden">
        <ProductPlaceholder className="size-full" />
        {children}
      </div>
    );
  }

  if (coverOnly) {
    return (
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={list[0]}
          alt={alt}
          loading="lazy"
          decoding="async"
          onClick={onImageTap ? () => onImageTap(0) : undefined}
          className={`size-full object-cover ${onImageTap ? "cursor-zoom-in" : ""}`}
        />
        {children}
      </div>
    );
  }

  return (
    <div className="group relative aspect-square overflow-hidden bg-muted">
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          tapRef.current = {
            x: e.clientX,
            y: e.clientY,
            scroll: trackRef.current?.scrollLeft ?? 0,
          };
        }}
        onPointerUp={(e) => {
          const start = tapRef.current;
          tapRef.current = null;
          if (!start || !onImageTap) return;
          const moved =
            Math.abs(e.clientX - start.x) > 8 ||
            Math.abs(e.clientY - start.y) > 8 ||
            Math.abs((trackRef.current?.scrollLeft ?? 0) - start.scroll) > 4;
          if (moved) return;
          const node = trackRef.current;
          const current = node ? Math.round(node.scrollLeft / (node.clientWidth || 1)) : index;
          onImageTap(current);
        }}
        onPointerCancel={() => {
          tapRef.current = null;
        }}
        className={`flex size-full snap-x snap-mandatory scroll-smooth ${
          multiple ? "overflow-x-auto" : "overflow-hidden"
        } overflow-y-hidden ${onImageTap ? "cursor-zoom-in" : ""} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        style={{ touchAction: multiple ? "pan-x pan-y pinch-zoom" : "pan-y pinch-zoom" }}
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

          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-n-700/55 px-2 py-1 backdrop-blur-sm">
            {list.map((src, i) => (
              <span
                key={`dot-${src}-${i}`}
                className={`size-1.5 rounded-full transition-colors ${
                  i === index ? "bg-lime-500" : "bg-white/70"
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