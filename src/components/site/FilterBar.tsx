import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { useStaffSession } from "@/lib/staff-session";

/**
 * Mobile-only floating filter pill: the single filter entry point under 1024px.
 * Auto-hides on scroll down, stacks above the admin edit-mode toolbar, and
 * stays hidden while any modal surface (filter panel, lightbox) is open.
 */
export function FilterBar({
  activeCount,
  onOpenFilters,
  suppressed,
}: {
  activeCount: number;
  onOpenFilters: () => void;
  suppressed?: boolean;
}) {
  const { isStaff, barDismissed } = useStaffSession();
  const [hidden, setHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) > 8) {
        setHidden(delta > 0 && y > 120);
        lastY.current = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sync = () =>
      setModalOpen(
        document.body.hasAttribute("data-scroll-locked") ||
          document.body.style.pointerEvents === "none",
      );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true });
    return () => observer.disconnect();
  }, []);

  if (suppressed || modalOpen) return null;

  const stacked = isStaff && !barDismissed;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-transform duration-200 ease-out lg:hidden"
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${stacked ? 148 : 12}px)`,
        transform: hidden ? "translateY(160%)" : "translateY(0)",
      }}
    >
      <div className="pointer-events-auto flex max-w-full items-center rounded-full border border-n-700 bg-n-900/95 p-1 text-white shadow-lift backdrop-blur">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount ? (
            <span className="rounded-full bg-lime-500 px-1.5 py-0.5 text-[10px] font-bold text-n-700">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
