import { Pencil, Plane, Ship } from "lucide-react";
import { useState } from "react";

import { formatPrice, specValue, type Product } from "@/lib/catalog";
import { airLeadLabel, seaLeadLabel, useShippingSettings } from "@/lib/shipping";
import { ProductImageCarousel } from "@/components/site/ProductImageCarousel";
import { ImageLightbox } from "@/components/site/ImageLightbox";
import { AddToQuoteRow } from "@/components/site/AddToQuoteRow";
import { useStaffSession } from "@/lib/staff-session";
import { ProductQuickEdit } from "@/components/site/ProductQuickEdit";

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

function SpecLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="whitespace-nowrap text-[10px] font-normal uppercase leading-3 tracking-[0.06em] text-n-500">
      {children}
    </p>
  );
}

function LeadRow({ icon: Icon, value }: { icon: typeof Plane; value: string | null }) {
  return (
    <p
      className={`flex items-center gap-1.5 truncate text-[12px] leading-4 tabular-nums ${
        value ? "font-medium text-n-700" : "font-normal text-n-500"
      }`}
    >
      <Icon className="size-[13px] shrink-0 text-n-500" strokeWidth={1.75} />
      <span className="truncate">{value ?? "On request"}</span>
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
  const price = product.show_price ? formatPrice(product.price) : null;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = product.images ?? [];
  const { editMode } = useStaffSession();
  const shipping = useShippingSettings();
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const hidden = editMode && !product.is_active;

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-card ${
        hidden ? "border-dashed border-n-300 opacity-60" : "border-n-200"
      }`}
    >
      {editMode ? (
        <>
          <button
            type="button"
            aria-label={`Quick edit ${product.name}`}
            onClick={() => setQuickEditOpen(true)}
            className="absolute right-2 top-2 z-20 inline-flex size-8 items-center justify-center rounded-full border border-n-200 bg-white/95 text-navy-700 shadow-card hover:bg-lime-500 hover:text-n-700"
          >
            <Pencil className="size-4" />
          </button>
          {hidden ? (
            <span className="absolute left-2 top-2 z-20 rounded-full bg-n-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Hidden
            </span>
          ) : null}
        </>
      ) : null}
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

        <div className="mt-auto flex h-[3.25rem] items-start border-t border-n-200 pt-2.5">
          <div className="min-w-0 shrink-0 basis-[38%] pr-2">
            <SpecLabel>MOQ</SpecLabel>
            <p className="mt-0.5 truncate text-[13px] font-medium leading-4 tabular-nums text-n-700">
              {specValue(product.moq)}
            </p>
          </div>
          <div className="min-w-0 flex-1 border-l border-n-200 pl-2.5">
            <SpecLabel>Lead time</SpecLabel>
            <div className="mt-0.5 space-y-0.5">
              <LeadRow icon={Plane} value={airLeadLabel(product, shipping)} />
              <LeadRow icon={Ship} value={seaLeadLabel(product, shipping)} />
            </div>
          </div>
        </div>

        <div className="mt-3 shrink-0">
          <AddToQuoteRow product={product} />
        </div>
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
              <div className="w-[15rem] shrink-0">
                <AddToQuoteRow product={product} tone="dark" />
              </div>
            </div>
          }
        />
      ) : null}

      {editMode && quickEditOpen ? (
        <ProductQuickEdit product={product} open={quickEditOpen} onOpenChange={setQuickEditOpen} />
      ) : null}
    </article>
  );
}
