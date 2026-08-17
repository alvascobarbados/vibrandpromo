import { useNavigate } from "@tanstack/react-router";
import { ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductPlaceholder } from "@/components/site/ProductPlaceholder";
import { QuantityStepper } from "@/components/site/QuantityStepper";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { fallbackToOriginal, variantPath } from "@/lib/image-variants";
import { useQuoteList, type QuoteItem } from "@/lib/quote-list";

/** Quote thumbs are stored as ready-made image URLs; swap to the 96px derivative. */
function thumbSrc(image: string) {
  return image.startsWith("/api/public/product-image/") ? variantPath(image, "thumb") : image;
}

function Row({
  item,
  flash,
  onQuantity,
  onRemove,
}: {
  item: QuoteItem;
  flash: boolean;
  onQuantity: (value: number) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={`flex gap-3 px-2 py-3 transition-colors duration-[1200ms] ease-out ${
        flash ? "bg-lime-50" : "bg-transparent"
      }`}
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-md border border-n-200">
        {item.image ? (
          <img
            src={thumbSrc(item.image)}
            alt={item.name}
            loading="lazy"
            className="size-full object-contain"
            onError={(event) => fallbackToOriginal(event, item.image as string)}
          />
        ) : (
          <ProductPlaceholder className="size-full" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {item.sku ? <p className="card-label truncate">{item.sku}</p> : null}
        <p className="line-clamp-2 text-sm font-medium text-foreground">{item.name}</p>
        <div className="mt-2">
          <QuantityStepper
            quantity={item.quantity}
            moq={item.moq ?? null}
            onChange={onQuantity}
            size="compact"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name}`}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-n-500 outline-none transition-colors hover:bg-n-100 hover:text-n-900 focus-visible:ring-2 focus-visible:ring-lime-500"
      >
        <X className="size-4" />
      </button>
    </li>
  );
}

export function QuoteDrawer() {
  const { items, count, drawerOpen, justAddedId, closeDrawer, updateItem, removeItem } =
    useQuoteList();
  const navigate = useNavigate();
  const [flashId, setFlashId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    if (!drawerOpen || !justAddedId) return;
    const added = items.find((item) => item.productId === justAddedId);
    if (added) setAnnounce(`${added.name} added to quote list`);
    setFlashId(justAddedId);
    const timer = setTimeout(() => setFlashId(null), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, justAddedId]);

  // Most recently added first; the just-added item is pinned to the very top.
  const ordered = [...items].reverse();
  const sorted = justAddedId
    ? [
        ...ordered.filter((item) => item.productId === justAddedId),
        ...ordered.filter((item) => item.productId !== justAddedId),
      ]
    : ordered;

  return (
    <Sheet open={drawerOpen} onOpenChange={(open) => (open ? undefined : closeDrawer())}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[400px]"
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-between border-b border-n-200 px-4 py-4">
          <div>
            <SheetTitle className="text-base">Quote list</SheetTitle>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {count} {count === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <span aria-live="polite" className="sr-only">
          {announce}
        </span>

        {count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBag className="size-8 text-n-400" />
            <p className="text-sm font-medium text-foreground">Your quote list is empty</p>
            <button
              type="button"
              onClick={closeDrawer}
              className="text-sm font-medium text-navy-700 underline-offset-2 hover:underline"
            >
              Browse products
            </button>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-n-100 overflow-y-auto px-2 py-1">
            {sorted.map((item) => (
              <Row
                key={item.productId}
                item={item}
                flash={flashId === item.productId}
                onQuantity={(value) => updateItem(item.productId, { quantity: value })}
                onRemove={() => removeItem(item.productId)}
              />
            ))}
          </ul>
        )}

        <div className="mt-auto space-y-2 border-t border-n-200 px-4 py-4">
          <button
            type="button"
            onClick={() => {
              closeDrawer();
              void navigate({ to: "/quote" });
            }}
            className="card-value inline-flex h-10 w-full items-center justify-center rounded-full bg-navy-700 !text-white shadow-card outline-none transition-colors hover:bg-navy-500 focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            Review &amp; request quote
          </button>
          <button
            type="button"
            onClick={closeDrawer}
            className="inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-medium text-n-700 outline-none transition-colors hover:bg-n-100 focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            Continue browsing
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
