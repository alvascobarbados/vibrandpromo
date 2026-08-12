import { Pencil, Plane, Ship } from "lucide-react";
import { useState } from "react";

import { specValue, type Product } from "@/lib/catalog";
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
      className="absolute bottom-[10px] right-[10px] z-10 size-[var(--badge-size)] overflow-hidden rounded-full border-2 border-white shadow-card"
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
  return <p className="card-label">{children}</p>;
}

function LeadRow({ icon: Icon, value }: { icon: typeof Plane; value: string | null }) {
  return (
    <p className="card-value flex h-[18px] items-center gap-1.5 [@container(max-width:199px)]:text-[13px]">
      <Icon className="size-[13px] shrink-0 text-n-500" strokeWidth={1.75} />
      <span className="whitespace-nowrap">{value ?? "On request"}</span>
    </p>
  );
}

const EMPTY_PHRASE = "Quoted per order";

/** Muted empty-state line; wraps instead of clipping on very narrow cards. */
function QuotedPerOrder({ className = "" }: { className?: string }) {
  return (
    <p
      className={`card-value !whitespace-normal leading-tight !text-n-500 [@container(max-width:199px)]:text-[13px] ${className}`}
    >
      {EMPTY_PHRASE}
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = product.images ?? [];
  const { editMode } = useStaffSession();
  const shipping = useShippingSettings();
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const hidden = editMode && !product.is_active;
  const air = airLeadLabel(product, shipping);
  const sea = seaLeadLabel(product, shipping);
  const hasLead = air != null && sea != null;
  const hasMoq = product.moq != null;

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
            className="absolute right-2 top-2 z-20 inline-flex size-7 items-center justify-center rounded-full border border-n-200 bg-white/95 text-navy-700 shadow-card transition-opacity duration-[180ms] ease-out hover:bg-lime-500 hover:text-n-700 sm:size-8 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
          >
            <Pencil className="size-3.5 sm:size-4" />
          </button>
          {hidden ? (
            <span className="card-label absolute left-2 top-2 z-20 rounded-full bg-n-700 px-2 py-0.5 !text-white">
              Hidden
            </span>
          ) : null}
        </>
      ) : null}
      <div className="overflow-hidden rounded-t-2xl bg-white">
        <ProductImageCarousel
          images={images}
          alt={product.name}
          coverOnly={coverOnly}
          fieldClassName="image-field-bleed"
          onImageTap={(i) => setLightboxIndex(i)}
        >
          <FlagBadge source={product.inventory_source} />
        </ProductImageCarousel>
      </div>

      <div className="flex flex-col p-2 pt-3 [@container(min-width:170px)]:p-3 [@container(min-width:170px)]:pt-3">
        <p className="card-label truncate">{product.sku ?? "—"}</p>
        <h3 className="card-title mt-1 line-clamp-2 h-[39px] overflow-hidden lg:h-[42px]">
          {product.name}
        </h3>

        {!hasMoq && !hasLead ? (
          <div className="mt-3 flex h-[69px] items-center border-t border-n-200 pt-3">
            <div className="flex w-full items-center">
              <QuotedPerOrder />
            </div>
          </div>
        ) : (
          <div className="relative mt-3 flex h-[69px] items-stretch border-t border-n-200 pt-3 [@container(min-width:200px)]:grid [@container(min-width:200px)]:grid-cols-[40%_60%]">
            <div className="flex min-w-0 shrink-0 justify-start pr-[12px] [@container(min-width:200px)]:justify-center">
              <div className="min-w-0 text-left">
                <SpecLabel>MOQ</SpecLabel>
                <p className="card-value mt-1 h-[18px] [@container(max-width:199px)]:text-[13px]">
                  {hasMoq ? specValue(product.moq) : "—"}
                </p>
              </div>
            </div>
            <div
              className="mr-[12px] w-px shrink-0 self-stretch bg-n-200 [@container(min-width:200px)]:hidden"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 left-[40%] top-3 hidden w-px bg-n-200 [@container(min-width:200px)]:block"
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-1 justify-start pr-[12px] [@container(min-width:200px)]:justify-center [@container(min-width:200px)]:pl-[12px] [@container(min-width:200px)]:pr-0">
              <div className="min-w-0 text-left">
                <SpecLabel>Lead time</SpecLabel>
                {hasLead ? (
                  <div className="mt-1 space-y-0.5">
                    <LeadRow icon={Plane} value={air} />
                    <LeadRow icon={Ship} value={sea} />
                  </div>
                ) : (
                  <div className="mt-1 flex h-[38px] items-center">
                    <QuotedPerOrder />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3">
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
