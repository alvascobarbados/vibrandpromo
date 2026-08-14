import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout, type ViewMode } from "@/components/site/SiteLayout";
import { LazySection } from "@/components/site/LazySection";
import { CategoryRow } from "@/components/site/CategoryRow";
import { categoriesQuery, subcategoriesQuery, type Product } from "@/lib/catalog";
import { useCatalogProducts } from "@/lib/staff-session";
import { FilterPanel } from "@/components/site/FilterPanel";
import { FilterBar } from "@/components/site/FilterBar";
import { FilterSheet } from "@/components/site/FilterSheet";
import { DesktopCatalog } from "@/components/site/DesktopCatalog";
import { useIsDesktop } from "@/hooks/use-desktop";
import { filterProducts } from "@/lib/catalog-filters";
import { useCatalogFilters } from "@/lib/use-catalog-filters";
import { useShippingSettings } from "@/lib/shipping";

/**
 * Shared catalog browsing experience. Rendered by the customer home route and
 * the staff-only /team supplier workspace. `viewMode` is the seam where
 * supplier-specific UI (cost fields, margin tools) will attach later — today it
 * only drives branding. Data always comes from the same query hooks.
 */
export function CatalogHome({ page, viewMode = "customer" }: { page: number; viewMode?: ViewMode }) {
  const products = useCatalogProducts();
  const isDesktop = useIsDesktop();
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const shipping = useShippingSettings();
  const navigate = useNavigate();
  const { search, toggle, clear, activeCount } = useCatalogFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const allProducts = products.data ?? [];
  const allCategories = categories.data ?? [];
  const allSubcategories = subcategories.data ?? [];

  /** Home never filters its own shelves — this count only feeds "Show N results". */
  const filteredCount = useMemo(
    () =>
      filterProducts(allProducts, search, {
        categories: allCategories,
        subcategories: allSubcategories,
        shipping,
      }).length,
    [allProducts, allCategories, allSubcategories, search, shipping],
  );

  const shelves = useMemo(() => {
    const byCategory = new Map<string, Product[]>();
    for (const product of allProducts) {
      if (!product.category_id) continue;
      const list = byCategory.get(product.category_id) ?? [];
      list.push(product);
      byCategory.set(product.category_id, list);
    }
    return allCategories
      .map((category) => ({ category, items: byCategory.get(category.id) ?? [] }))
      .filter((shelf) => shelf.items.length > 0);
  }, [allProducts, allCategories]);

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

  // /team uses the single-column landscape list at every width.
  if (isDesktop || viewMode === "supplier") {
    return (
      <SiteLayout viewMode={viewMode}>
        <div className="site-container xl:max-w-[1344px] py-8 pb-16">
          <h1 className="sr-only">Vibrand promotional products catalogue</h1>
          <DesktopCatalog page={page} />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout viewMode={viewMode}>
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
        onOpenFilters={() => setFiltersOpen(true)}
        suppressed={filtersOpen}
      />

      <FilterSheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <FilterPanel
            variant="drawer"
            products={allProducts}
            categories={allCategories}
            subcategories={allSubcategories}
            search={search}
            resultCount={filteredCount}
            onToggle={toggle}
            onClear={clear}
            activeCount={activeCount}
            onClose={() => {
              setFiltersOpen(false);
              void navigate({ to: "/products", search: { ...search, page: 1 } });
            }}
        />
      </FilterSheet>
    </SiteLayout>
  );
}
