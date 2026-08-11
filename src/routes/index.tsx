import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/site/SiteLayout";
import { LazySection } from "@/components/site/LazySection";
import { CategoryRow } from "@/components/site/CategoryRow";
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
        content: "Browse Vibrand promotional products by category — apparel, bags, drinkware, barware, display, technology and more. Add items to your quote list.",
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
  const [activeChip, setActiveChip] = useState("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target instanceof HTMLElement) {
          setActiveChip(visible.target.dataset['cat'] ?? "all");
        }
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: 0 },
    );
    for (const node of Object.values(sectionRefs.current)) {
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [shelves]);

  function scrollToSection(target: string) {
    setActiveChip(target);
    const node =
      target === "all" ? document.getElementById("home-top") : sectionRefs.current[target];
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <SiteLayout>
      {shelves.length ? (
        <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ slug: "all", name: "All" }, ...shelves.map((s) => s.category)].map((chip) => (
                <button
                  key={chip.slug}
                  type="button"
                  onClick={() => scrollToSection(chip.slug)}
                  aria-current={activeChip === chip.slug}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    activeChip === chip.slug
                      ? "border-lime-500 bg-lime-500 text-n-700"
                      : "border-n-200 bg-white text-n-700 hover:bg-n-50"
                  }`}
                >
                  {chip.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div id="home-top" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="sr-only">Vibrand promotional products by category</h1>

        {loading ? (
          <div className="space-y-12">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-6 w-48" />
                <div className="mt-6 flex gap-3 overflow-hidden">
                  {Array.from({ length: 4 }).map((__, i) => (
                    <div
                      key={i}
                      className="w-[calc((100%-1.5rem)/2.1)] shrink-0 sm:w-[calc((100%-2.25rem)/3.3)] xl:w-[calc((100%-3rem)/4.3)]"
                    >
                      <Skeleton className="aspect-square rounded-t-2xl" />
                      <Skeleton className="mt-0.5 h-[199px] rounded-b-2xl" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {shelves.map(({ category, items }, index) => {
              const preview = items.slice(0, 8);
              return (
                <section
                  key={category.id}
                  data-cat={category.slug}
                  ref={(node) => {
                    sectionRefs.current[category.slug] = node;
                  }}
                  aria-labelledby={`shelf-${category.slug}`}
                  className="scroll-mt-32"
                >
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
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-navy-500 hover:text-navy-700 hover:underline"
                    >
                      See all <ArrowRight className="size-4" />
                    </Link>
                  </div>

                  <div className="mt-6">
                    <LazySection eager={index < 2} layout="row" placeholderCount={4}>
                      <CategoryRow
                        items={preview}
                        total={items.length}
                        categorySlug={category.slug}
                      />
                    </LazySection>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-12 flex justify-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full bg-navy-700 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-800 active:bg-navy-900"
          >
            Browse all products <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}
