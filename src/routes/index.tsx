import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SiteLayout } from "@/components/site/SiteLayout";
import { LazySection } from "@/components/site/LazySection";
import { CategoryRow } from "@/components/site/CategoryRow";
import { categoriesQuery, type Product } from "@/lib/catalog";
import { subcategoriesQuery } from "@/lib/catalog";
import { useCatalogProducts } from "@/lib/staff-session";
import { FilterPanel } from "@/components/site/FilterPanel";
import { FilterBar } from "@/components/site/FilterBar";
import { filterProducts, parseCatalogSearch, type CatalogSearch } from "@/lib/catalog-filters";
import { useCatalogFilters } from "@/lib/use-catalog-filters";
import { useShippingSettings } from "@/lib/shipping";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Partial<CatalogSearch> & {
    page?: number;
  } => ({
    ...parseCatalogSearch(search),
    page: Number(search['page']) > 0 ? Number(search['page']) : 1,
  }),
  search: {
    middlewares: [
      stripSearchParams({
        q: "",
        sort: "default",
        page: 1,
        cat: [],
        sub: [],
        moq: [],
        prod: [],
        colour: [],
        deco: [],
        src: [],
        mat: [],
      }),
    ],
  },
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
  const products = useCatalogProducts();
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const shipping = useShippingSettings();
  const navigate = useNavigate();
  const { search, scope, setScope, toggle, clear, activeCount } = useCatalogFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const allProducts = products.data ?? [];
  const allCategories = categories.data ?? [];
  const allSubcategories = subcategories.data ?? [];

  const scoped = useMemo(
    () =>
      filterProducts(allProducts, search, {
        categories: allCategories,
        subcategories: allSubcategories,
        shipping,
      }),
    [allProducts, allCategories, allSubcategories, search, shipping],
  );

  const shelves = useMemo(() => {
    const byCategory = new Map<string, Product[]>();
    for (const product of scoped) {
      if (!product.category_id) continue;
      const list = byCategory.get(product.category_id) ?? [];
      list.push(product);
      byCategory.set(product.category_id, list);
    }
    return allCategories
      .map((category) => ({ category, items: byCategory.get(category.id) ?? [] }))
      .filter((shelf) => shelf.items.length > 0);
  }, [scoped, allCategories]);

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
          <div className="site-container">
            <div className="site-scroller flex gap-2 py-3">
              {[{ slug: "all", name: "All" }, ...shelves.map((s) => s.category)].map((chip) => (
                <button
                  key={chip.slug}
                  type="button"
                  onClick={() => scrollToSection(chip.slug)}
                  aria-current={activeChip === chip.slug}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-[150ms] ease-out ${
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

      <div id="home-top" className="site-container py-6 pb-28 lg:py-8 lg:pb-16">
        <h1 className="sr-only">Vibrand promotional products by category</h1>

        {loading ? (
          <div className="space-y-10 lg:space-y-16">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-6 w-48" />
                <div className="mt-4 flex gap-3 overflow-hidden md:gap-5 lg:mt-5 lg:gap-6">
                  {Array.from({ length: 4 }).map((__, i) => (
                    <div
                      key={i}
                      className="w-[calc((100%-1.5rem)/2.1)] shrink-0 sm:w-[228px] md:w-[240px] lg:w-[252px] xl:w-[264px]"
                    >
                      <Skeleton className="aspect-square rounded-2xl" />
                      <Skeleton className="mt-0.5 h-[199px] rounded-b-2xl" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : shelves.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No products match your filters.</p>
            <button
              type="button"
              onClick={clear}
              className="mt-4 rounded-full border border-n-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-10 lg:space-y-16">
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
                      className="font-display text-[20px] font-semibold leading-[1.3] text-foreground lg:text-[24px]"
                    >
                      {category.name}
                      <span className="ml-2 text-sm font-medium text-muted-foreground">
                        {items.length} item{items.length === 1 ? "" : "s"}
                      </span>
                    </h2>
                    <Link
                      to="/c/$slug"
                      params={{ slug: category.slug }}
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-navy-500 transition-colors duration-[150ms] ease-out hover:text-navy-700 hover:underline"
                    >
                      See all <ArrowRight className="size-4" />
                    </Link>
                  </div>

                  <div className="mt-4 lg:mt-5">
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

        <div className="mt-10 flex justify-center lg:mt-16">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full bg-navy-700 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors duration-[150ms] ease-out hover:bg-navy-800 active:bg-navy-900"
          >
            Browse all products <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <FilterBar
        activeCount={activeCount}
        scope={scope}
        onScope={setScope}
        onOpenFilters={() => setFiltersOpen(true)}
        suppressed={filtersOpen}
      />

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <FilterPanel
            variant="drawer"
            products={allProducts}
            categories={allCategories}
            subcategories={allSubcategories}
            search={search}
            resultCount={scoped.length}
            scope={scope}
            onScope={setScope}
            onToggle={toggle}
            onClear={clear}
            activeCount={activeCount}
            onClose={() => {
              setFiltersOpen(false);
              void navigate({ to: "/products", search: { ...search, page: 1 } });
            }}
          />
        </SheetContent>
      </Sheet>
    </SiteLayout>
  );
}
