import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/site/SiteLayout";
import { categoriesQuery, formatPrice, productBySlugQuery, productImage } from "@/lib/catalog";
import { useQuoteList } from "@/lib/quote-list";

export const Route = createFileRoute("/products/$slug")({
  head: () => ({
    meta: [
      { title: "Product Details | Alvasco Promotional Products" },
      {
        name: "description",
        content:
          "View specifications, branding options and indicative pricing, then add this promotional product to your Alvasco quote list.",
      },
      { property: "og:title", content: "Product Details | Alvasco Promotional Products" },
      {
        property: "og:description",
        content: "Add this branded product to your quote list and we'll respond within 24 hours.",
      },
    ],
  }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const product = useQuery(productBySlugQuery(slug));
  const categories = useQuery(categoriesQuery);
  const { addItem } = useQuoteList();

  const [quantity, setQuantity] = useState(25);
  const [notes, setNotes] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  if (product.isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-40" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  const item = product.data;

  if (!item) {
    return (
      <SiteLayout>
        <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <p className="mt-3 text-muted-foreground">
            This product may have been removed or is no longer available.
          </p>
          <Button asChild className="mt-6">
            <Link to="/products">Back to catalogue</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const images = item.images?.length ? item.images : [productImage(item)];
  const price = item.show_price ? formatPrice(item.price) : null;
  const category = (categories.data ?? []).find((c) => c.id === item.category_id);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Back to all products
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-muted">
              <img
                src={images[activeImage] ?? images[0]}
                alt={item.name}
                className="aspect-square w-full object-cover"
              />
            </div>
            {images.length > 1 ? (
              <div className="mt-4 flex gap-3">
                {images.map((image, index) => (
                  <button
                    key={image + index}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`size-20 overflow-hidden rounded-xl border-2 transition-colors ${
                      index === activeImage ? "border-primary" : "border-border"
                    }`}
                  >
                    <img src={image} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            {category ? (
              <Link
                to="/category/$slug"
                params={{ slug: category.slug }}
                className="text-sm font-semibold uppercase tracking-wide text-primary"
              >
                {category.name}
              </Link>
            ) : null}
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{item.name}</h1>
            <p className="mt-4 text-2xl font-semibold text-primary">{price ?? "Request Pricing"}</p>
            {price ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Indicative pricing only — final quote depends on quantity and branding.
              </p>
            ) : null}

            {item.description ? (
              <p className="mt-6 text-muted-foreground">{item.description}</p>
            ) : null}

            {item.details ? (
              <div className="mt-6 rounded-2xl border border-border bg-secondary p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide">Product details</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {item.details}
                </p>
              </div>
            ) : null}

            <div className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
              <div>
                <Label>Quantity</Label>
                <div className="mt-2 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((value) => Math.max(1, value - 5))}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                    className="h-10 w-24 rounded-md border border-input bg-background text-center text-base"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((value) => value + 5)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g. logo placement, colours, deadline"
                  className="mt-2"
                  rows={3}
                />
              </div>

              <Button
                size="lg"
                className="w-full gap-2"
                onClick={() => {
                  addItem({
                    productId: item.id,
                    slug: item.slug,
                    name: item.name,
                    image: productImage(item),
                    quantity,
                    notes,
                  });
                  toast.success("Added to your quote list");
                }}
              >
                <ClipboardList className="size-5" /> Add to Quote
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No payment required — this simply builds your quote request.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}