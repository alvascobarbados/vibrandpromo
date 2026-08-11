import { useEffect, useRef, useState, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export function LazySection({
  eager = false,
  placeholderCount = 6,
  children,
}: {
  eager?: boolean;
  placeholderCount?: number;
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

  return (
    <div ref={ref} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: placeholderCount }).map((_, index) => (
        <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
      ))}
    </div>
  );
}