import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { productImage, PRODUCT_FALLBACK_IMAGE, type Product } from "@/lib/catalog";
import { useQuoteList } from "@/lib/quote-list";
import { ImageLightbox } from "@/components/site/ImageLightbox";

export function CompactProductCard({ product }: { product: Product }) {
  const { addItem, items } = useQuoteList();
  const inQuote = items.some((item) => item.productId === product.id);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const images = product.images?.length ? product.images : [PRODUCT_FALLBACK_IMAGE];
  const usa = product.inventory_source === "USA Inventory";

  const addToQuote = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: productImage(product),
      quantity: product.moq,
      notes: "",
    });
    toast.success(`${product.name} added at MOQ ${product.moq}`);
  };

  return (
    <article className="w-40 shrink-0 sm:w-44">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View ${product.name} images`}
          className="block aspect-square w-full"
        >
          <img
            src={images[0]}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover"
          />
        </button>
        <span
          title={product.inventory_source}
          aria-label={product.inventory_source}
          className="pointer-events-none absolute bottom-2 right-2 size-6 overflow-hidden rounded-full border-2 border-white shadow-card"
        >
          <img
            src={usa ? "https://flagcdn.com/w80/us.png" : "https://flagcdn.com/w80/cn.png"}
            alt={product.inventory_source}
            loading="lazy"
            className="size-full object-cover"
          />
        </span>
      </div>

      <div className="mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
            {product.name}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">MOQ {product.moq}</p>
        </div>
        <button
          type="button"
          disabled={inQuote}
          onClick={addToQuote}
          aria-label={inQuote ? `${product.name} is in your quote` : `Add ${product.name} to quote`}
          className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
            inQuote
              ? "border-lime bg-lime text-lime-foreground"
              : "border-charcoal bg-charcoal text-charcoal-foreground hover:bg-charcoal/90"
          }`}
        >
          {inQuote ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
        </button>
      </div>

      {lightboxOpen ? (
        <ImageLightbox
          images={images}
          alt={product.name}
          startIndex={0}
          onClose={() => setLightboxOpen(false)}
          footer={
            <div className="flex items-center gap-3 border-t border-white/10 bg-charcoal/80 px-4 py-3 backdrop-blur-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                <p className="text-xs text-white/60">{product.sku ?? "—"}</p>
              </div>
              <button
                type="button"
                disabled={inQuote}
                onClick={addToQuote}
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  inQuote
                    ? "border-lime bg-lime text-lime-foreground"
                    : "border-white/40 text-white hover:border-lime hover:text-lime"
                }`}
              >
                {inQuote ? (
                  <>
                    <Check className="size-3.5" /> In Quote
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" /> Add to Quote
                  </>
                )}
              </button>
            </div>
          }
        />
      ) : null}
    </article>
  );
}
