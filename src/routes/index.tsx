import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CompactProductCard } from "@/components/site/CompactProductCard";
import { categoriesQuery, publicProductsQuery, type Product } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Promotional Products by Category | Vibrand Barbados" },
      {
        name: "description",
        content:
          "Browse Vibrand promotional products by category — apparel, bags, drinkware, barware, display, technology and more. Add items to your quote list.",
      },
      { property: "og:title", content: "Promotional Products by Category | Vibrand Barbados" },
      {
        property: "og:description",
        content: "Discover branded merchandise category by category and build a quote in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const products = useQuery(publicProductsQuery);
  const categories = useQuery(categoriesQuery);

  const shelves = useMemo(() => {
    const byCategory = new Map<string, Product[]>();
    for (const product of products.data ?? []) {
      if (!product.category_id) continue;
      const list = byCategory.get(product.category_id) ?? [];
      list.push(product);
      byCategory.set(product.category_id, list);
    }
    return (categories.data ?? [])
      .map((category) => ({ category, items: byCategory.get(category.id) ?? [] }))
      .filter((shelf) => shelf.items.length > 0);
  }, [products.data, categories.data]);

  const loading = products.isLoading || categories.isLoading;

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="sr-only">Vibrand promotional products by category</h1>

        {loading ? (
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-6 w-48" />
                <div className="mt-3 flex gap-4 overflow-hidden">
                  {Array.from({ length: 5 }).map((__, i) => (
                    <Skeleton key={i} className="size-40 shrink-0 rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {shelves.map(({ category, items }) => (
              <section key={category.id} aria-labelledby={`shelf-${category.slug}`}>
                <div className="flex items-end justify-between gap-3">
                  <h2
                    id={`shelf-${category.slug}`}
                    className="font-display text-lg font-bold text-foreground sm:text-xl"
                  >
                    {category.name}
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      {items.length} item{items.length === 1 ? "" : "s"}
                    </span>
                  </h2>
                  <Link
                    to="/c/$slug"
                    params={{ slug: category.slug }}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-charcoal hover:underline"
                  >
                    See all <ArrowRight className="size-4" />
                  </Link>
                </div>

                <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {items.map((product) => (
                    <div key={product.id} className="snap-start">
                      <CompactProductCard product={product} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 flex justify-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full bg-charcoal px-6 py-3 text-sm font-bold uppercase tracking-wide text-charcoal-foreground hover:bg-charcoal/90"
          >
            Browse all products <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}
