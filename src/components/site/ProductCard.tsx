import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { formatPrice, productImage, specValue, type Product } from "@/lib/catalog";
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

function SpecValue({ value }: { value: string }) {
  return (
    <p
      className={`mt-0.5 truncate font-bold leading-5 tabular-nums text-navy-700 ${
        value.length > 8
          ? "text-[clamp(5.5px,1.9vw,12px)]"
          : value.length > 5
            ? "text-[clamp(9px,2.9vw,14px)]"
            : "text-[clamp(11px,3.4vw,14px)]"
      }`}
    >
      {value}
    </p>
  );
}

export function ProductCard({
  product,
  coverOnly = false,
}: {
  product: Product;
  coverOnly?: boolean;
}) {
  const { addItem, items } = useQuoteList();
  const inQuote = items.some((item) => item.productId === product.id);
  const price = product.show_price ? formatPrice(product.price) : null;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = product.images ?? [];

  const addToQuote = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: productImage(product),
      quantity: product.moq ?? 1,
      notes: "",
    });
    toast.success(
      product.moq
        ? `${product.name} added at MOQ ${product.moq}`
        : `${product.name} added — MOQ on request`,
    );
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-n-200 bg-white shadow-card">
      <ProductImageCarousel
        images={images}
        alt={product.name}
        coverOnly={coverOnly}
        onImageTap={(i) => setLightboxIndex(i)}
      >
        <FlagBadge source={product.inventory_source} />
      </ProductImageCarousel>

      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-xs font-medium leading-4 text-n-500">
          {product.sku ?? "—"}
        </p>
        <h3 className="mt-0.5 line-clamp-2 h-[2.5rem] text-sm font-semibold leading-5 text-n-900">
          {product.name}
        </h3>
        <p className="mt-1 h-[1.25rem] truncate text-sm font-semibold leading-5 text-n-700">
          {price ?? "\u00a0"}
        </p>

        <div className="mt-auto grid grid-cols-2 border-t border-n-200 pt-3 text-center">
          <div className="min-w-0 pl-1 pr-2 sm:pr-3">
            <p className="whitespace-nowrap text-[clamp(5.5px,1.7vw,9px)] font-semibold uppercase leading-3 tracking-[-0.04em] text-n-500">
              MOQ
            </p>
            <SpecValue value={specValue(product.moq)} />
          </div>
          <div className="min-w-0 border-l border-n-200 pl-2 pr-1 sm:pl-3">
            <p className="whitespace-nowrap text-[clamp(5.5px,1.7vw,9px)] font-semibold uppercase leading-3 tracking-[-0.04em] text-n-500">
              Production
            </p>
            <SpecValue value={specValue(product.production_days, "days")} />
          </div>
        </div>

        <button
          type="button"
          disabled={inQuote}
          onClick={addToQuote}
          className={`mt-3 inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[10px] font-bold uppercase leading-none tracking-wide sm:text-[11px] transition-colors ${
            inQuote
              ? "border-lime-500 bg-lime-500 text-n-700"
              : "border-navy-700 bg-navy-700 text-white hover:bg-navy-800 active:bg-navy-900"
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
            <div className="flex items-center gap-3 border-t border-white/10 bg-n-900/80 px-4 py-3 backdrop-blur-sm">
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
                    ? "border-lime-500 bg-lime-500 text-n-700"
                    : "border-white/40 text-white hover:border-lime-500 hover:bg-lime-500 hover:text-n-700"
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
