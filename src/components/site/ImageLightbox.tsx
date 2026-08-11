import { X } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductPlaceholder } from "@/components/site/ProductPlaceholder";

const CLOSE_DRAG = 110;

export function ImageLightbox({
  images: rawImages,
  alt,
  startIndex,
  onClose,
  footer,
}: {
  images: string[];
  alt: string;
  startIndex: number;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const [index, setIndex] = useState(startIndex);
  const [loaded, setLoaded] = useState<number[]>([startIndex]);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [entered, setEntered] = useState(false);

  const startRef = useRef<{ x: number; y: number; axis: "" | "x" | "y" } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const lastTapRef = useRef(0);
  const closedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const scrollRef = useRef(typeof window === "undefined" ? 0 : window.scrollY);

  const markLoaded = useCallback((i: number) => {
    setLoaded((prev) => (prev.includes(i) || i < 0 || i >= images.length ? prev : [...prev, i]));
  }, [images.length]);

  useEffect(() => {
    markLoaded(index - 1);
    markLoaded(index);
    markLoaded(index + 1);
  }, [index, markLoaded]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // lock page scroll without losing position
  useEffect(() => {
    const body = document.body;
    const scrollY = scrollRef.current;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `${-scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const restore = () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
      setTimeout(() => window.scrollTo(0, scrollY), 80);
      setTimeout(() => window.scrollTo(0, scrollY), 260);
    };
    return restore;
  }, []);

  const finish = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  // back button / gesture closes the lightbox and stays on the catalog
  useEffect(() => {
    return router.history.block({
      enableBeforeUnload: false,
      blockerFn: ({ action }: { action: string }) => {
        if (action === "BACK") {
          finish();
          return true;
        }
        return false;
      },
    });
  }, [finish, router]);

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(images.length - 1, next));
      resetZoom();
      setIndex(clamped);
    },
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, go, index]);

  const dist = (touches: React.TouchList) => {
    const a = touches[0];
    const b = touches[1];
    if (!a || !b) return 0;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: dist(e.touches), zoom };
      startRef.current = null;
      return;
    }
    const t = e.touches[0];
    if (!t) return;
    startRef.current = { x: t.clientX, y: t.clientY, axis: "" };
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const scale = dist(e.touches) / (pinchRef.current.dist || 1);
      setZoom(Math.max(1, Math.min(4, pinchRef.current.zoom * scale)));
      return;
    }
    const start = startRef.current;
    const t = e.touches[0];
    if (!start || !t || e.touches.length !== 1) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (zoom > 1) {
      setPan((p) => ({ x: p.x + dx * 0.5, y: p.y + dy * 0.5 }));
      startRef.current = { ...start, x: t.clientX, y: t.clientY };
      return;
    }
    if (!start.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (start.axis === "x") setDragX(dx);
    else if (start.axis === "y") setDragY(Math.max(0, dy));
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
    const start = startRef.current;
    setDragging(false);
    if (start?.axis === "y" && dragY > CLOSE_DRAG) {
      finish();
      return;
    }
    if (start?.axis === "x" && Math.abs(dragX) > 60) {
      go(dragX < 0 ? index + 1 : index - 1);
    }
    setDragX(0);
    setDragY(0);
    startRef.current = null;
  };

  const onImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (zoom > 1) resetZoom();
      else setZoom(2.5);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ touchAction: "none" }}
    >
      <div
        className="absolute inset-0 bg-charcoal/95 transition-opacity duration-200"
        style={{ opacity: entered ? Math.max(0, 1 - dragY / 400) : 0 }}
        onClick={finish}
      />

      <button
        type="button"
        aria-label="Close"
        onClick={finish}
        className="absolute right-3 top-3 z-20 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <div
        ref={containerRef}
        className="relative z-10 flex flex-1 items-center justify-center overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) finish();
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex size-full items-center"
          style={{
            transform: `translate3d(calc(${-index * 100}% + ${dragX}px), ${dragY}px, 0) scale(${
              entered ? 1 - Math.min(dragY, 300) / 1200 : 0.85
            })`,
            opacity: entered ? 1 : 0,
            transition: dragging ? "none" : "transform 260ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease-out",
          }}
        >
          {images.length === 0 ? (
            <div className="flex size-full shrink-0 items-center justify-center p-4">
              <ProductPlaceholder variant="dark" className="aspect-square w-full max-w-lg rounded-2xl" />
            </div>
          ) : null}
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="flex size-full shrink-0 items-center justify-center p-4">
              {loaded.includes(i) ? (
                <img
                  src={src}
                  alt={i === 0 ? alt : `${alt} — image ${i + 1}`}
                  draggable={false}
                  onClick={onImageTap}
                  className="max-h-full max-w-full select-none object-contain"
                  style={{
                    transform:
                      i === index ? `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` : undefined,
                    transition: dragging ? "none" : "transform 200ms ease-out",
                  }}
                />
              ) : (
                <div className="size-24 rounded-full bg-white/5" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 ? (
        <div className="relative z-10 flex items-center justify-center gap-3 pb-2">
          <div className="flex items-center gap-1.5">
            {images.map((src, i) => (
              <span
                key={`lb-dot-${src}-${i}`}
                className={`size-1.5 rounded-full transition-colors ${
                  i === index ? "bg-lime" : "bg-white/40"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-white/70">
            {index + 1} / {images.length}
          </span>
        </div>
      ) : null}

      {footer ? <div className="relative z-10">{footer}</div> : null}
    </div>
  );
}
