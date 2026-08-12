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
      className="absolute bottom-[var(--badge-inset)] right-[var(--badge-inset)] size-[var(--badge-size)] overflow-hidden rounded-full border-2 border-white shadow-card"
    >
      <img
        src={usa ? "https://flagcdn.com/w80/us.png" : "https://flagcdn.com/w80/cn.png"}
        alt={usa ? "USA Inventory" : "Factory Direct"}
        loading="lazy"
        width={22}
        height={22}
        className="size-full object-cover"
      />
    </span>
  );
}

function SpecLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="whitespace-nowrap text-[10px] font-normal uppercase leading-3 tracking-[0.01em] text-n-500 lg:text-[11px]">
      {children}
    </p>
  );
}

function LeadRow({ icon: Icon, value }: { icon: typeof Plane; value: string | null }) {
  return (
    <p
      className={`flex items-center gap-1 whitespace-nowrap leading-4 tabular-nums ${
        value ? "font-medium text-n-700" : "font-normal text-n-500"
      }`}
    >
      <Icon
        className="size-3 shrink-0 translate-y-[0.5px] text-n-500 [@container(min-width:170px)]:size-[13px]"
        strokeWidth={1.75}
      />
      <span className="whitespace-nowrap text-[clamp(9px,6.2cqw,12px)] lg:text-[clamp(10px,6.2cqw,13px)]">
        {value ?? "On request"}
      </span>
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
      className={`group @container relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-shadow duration-[180ms] ease-out [@media(hover:hover)]:hover:shadow-hover ${
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
      <div className="p-2 pb-0 [@container(min-width:170px)]:p-3 [@container(min-width:170px)]:pb-0">
        <ProductImageCarousel
          images={images}
          alt={product.name}
          coverOnly={coverOnly}
          onImageTap={(i) => setLightboxIndex(i)}
        >
          <FlagBadge source={product.inventory_source} />
        </ProductImageCarousel>
      </div>

      <div className="flex flex-1 flex-col p-2 pt-3 [@container(min-width:170px)]:p-3 [@container(min-width:170px)]:pt-3">
        <p className="truncate text-[10px] font-medium leading-4 text-n-500 lg:text-[11px]">
          {product.sku ?? "—"}
        </p>
        <h3 className="mt-1 line-clamp-2 h-[34px] overflow-hidden text-[13px] font-semibold leading-[1.3] text-n-900 lg:h-[39px] lg:text-[15px]">
          {product.name}
        </h3>
        <p className="mt-2 h-[1.25rem] truncate text-[13px] font-semibold leading-5 text-n-700 lg:text-[14px]">
          {price ?? "\u00a0"}
        </p>

        <div className="mt-auto flex min-h-[3.25rem] flex-col items-stretch border-t border-n-200 pt-3 [@container(min-width:150px)]:flex-row">
          <div className="shrink-0 [@container(min-width:150px)]:pr-2">
            <SpecLabel>MOQ</SpecLabel>
            <p
              className={`mt-0.5 whitespace-nowrap font-medium leading-4 tabular-nums text-n-700 ${
                product.moq
                  ? "text-[clamp(11px,7cqw,13px)] lg:text-[clamp(12px,7cqw,14px)]"
                  : "text-[clamp(9px,5.6cqw,12px)] font-normal text-n-500"
              }`}
            >
              {specValue(product.moq)}
            </p>
          </div>
          <div className="mt-1 min-w-0 flex-1 [@container(min-width:150px)]:mt-0 [@container(min-width:150px)]:border-l [@container(min-width:150px)]:border-n-200 [@container(min-width:150px)]:pl-2">
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
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                <p className="text-xs text-white/60">{product.sku ?? "—"}</p>
              </div>
              <div className="@container w-[15rem] shrink-0">
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
