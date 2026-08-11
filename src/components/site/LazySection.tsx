import { useEffect, useRef, useState, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export function LazySection({
  eager = false,
  placeholderCount = 6,
  layout = "grid",
  children,
}: {
  eager?: boolean;
  placeholderCount?: number;
  layout?: "grid" | "row";
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(eager);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  if (visible) return <>{children}</>;

  if (layout === "row") {
    return (
      <div ref={ref} className="flex gap-3 overflow-hidden pb-1">
        {Array.from({ length: placeholderCount }).map((_, index) => (
          <div
            key={index}
            className="w-[calc((100%-1.5rem)/2.25)] shrink-0 sm:w-[calc((100%-2.25rem)/3.3)] xl:w-[calc((100%-3rem)/4.3)]"
          >
            <Skeleton className="aspect-square rounded-t-2xl" />
            <Skeleton className="mt-0.5 h-[210px] rounded-b-2xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: placeholderCount }).map((_, index) => (
        <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
      ))}
    </div>
  );
}