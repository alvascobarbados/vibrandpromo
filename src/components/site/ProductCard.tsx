import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { formatPrice, productImage, PRODUCT_FALLBACK_IMAGE, type Product } from "@/lib/catalog";
import { useQuoteList } from "@/lib/quote-list";
import { ProductImageCarousel } from "@/components/site/ProductImageCarousel";
import { ImageLightbox } from "@/components/site/ImageLightbox";

function FlagBadge({ source }: { source: string }) {
  const usa = source === "USA Inventory";
  return (
    <span
      title={source}
      aria-label={source}
      className="absolute bottom-2 right-2 size-7 overflow-hidden rounded-full border-2 border-white shadow-card"
    >
      <img
        src={usa ? "https://flagcdn.com/w80/us.png" : "https://flagcdn.com/w80/cn.png"}
        alt={usa ? "USA Inventory" : "Factory Direct"}
        loading="lazy"
        width={28}
        height={28}
        className="size-full object-cover"
      />
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useQuoteList();
  const inQuote = items.some((item) => item.productId === product.id);
  const price = product.show_price ? formatPrice(product.price) : null;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = product.images?.length ? product.images : [PRODUCT_FALLBACK_IMAGE];

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
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <ProductImageCarousel
        images={images}
        alt={product.name}
        onImageTap={(i) => setLightboxIndex(i)}
      >
        <FlagBadge source={product.inventory_source} />
      </ProductImageCarousel>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs font-medium text-muted-foreground">{product.sku ?? "—"}</p>
        <h3 className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{product.name}</h3>
        {price ? <p className="mt-1 text-sm font-semibold text-charcoal">{price}</p> : null}

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              MOQ
            </p>
            <p className="text-sm font-semibold text-foreground">{product.moq}</p>
          </div>
          <div className="border-l border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Production
            </p>
            <p className="text-sm font-semibold text-foreground">{product.production_days} days</p>
          </div>
        </div>

        <button
          type="button"
          disabled={inQuote}
          onClick={addToQuote}
          className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
            inQuote
              ? "border-lime bg-lime text-lime-foreground"
              : "border-charcoal bg-charcoal text-charcoal-foreground hover:bg-charcoal/90"
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

      {lightboxIndex !== null ? (
        <ImageLightbox
          images={images}
          alt={product.name}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
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
