import { useEffect, useRef, useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";

/**
 * Mobile filter surface: a bottom sheet at ~88vh with rounded top corners and a
 * drag handle. Dismiss by scrim tap, swipe down on the handle, Escape, the X,
 * or the phone back button — none of which apply anything new.
 */
export function FilterSheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setDrag(0);
    const onPop = () => onOpenChange(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88vh] gap-0 rounded-t-2xl p-0 lg:hidden"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none items-center justify-center py-2.5"
          onPointerDown={(event) => {
            startY.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (startY.current === null) return;
            setDrag(Math.max(0, event.clientY - startY.current));
          }}
          onPointerUp={() => {
            if (drag > 80) onOpenChange(false);
            startY.current = null;
            setDrag(0);
          }}
        >
          <span className="h-1.5 w-10 rounded-full bg-n-200" />
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
