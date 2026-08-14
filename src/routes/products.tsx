import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductExpandedCard } from "@/components/site/ProductExpandedCard";
import { ViewToggle, useCatalogView } from "@/components/site/ViewToggle";
import { FilterPanel } from "@/components/site/FilterPanel";
import { FilterBar } from "@/components/site/FilterBar";
import { FilterSheet } from "@/components/site/FilterSheet";
import { categoriesQuery, subcategoriesQuery } from "@/lib/catalog";
import { useCatalogProducts } from "@/lib/staff-session";
import {
  GROUP_LABELS,
  SORT_OPTIONS,
  filterProducts,
  parseCatalogSearch,
  sortProducts,
  type CatalogSearch,
  type FilterGroupId,
} from "@/lib/catalog-filters";
import { useCatalogFilters } from "@/lib/use-catalog-filters";
import { useShippingSettings } from "@/lib/shipping";
import { warnInvisibleFilter } from "@/lib/filter-hygiene";
import { useCustomerPricing } from "@/lib/customer-pricing";
import { useIsDesktop } from "@/hooks/use-desktop";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/products")({
  validateSearch: (
    search: Record<string, unknown>,
  ): Partial<CatalogSearch> & { page?: number; view?: string } => ({
    ...parseCatalogSearch(search),
    page: Number(search['page']) > 0 ? Number(search['page']) : 1,
    view: search['view'] === "expanded" ? "expanded" : "grid",
  }),
  search: {
    middlewares: [
      stripSearchParams({
        q: "",
        sort: "default",
        page: 1,
        view: "grid",
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
      { title: "All Promotional Products | Vibrand Barbados" },
      {
        name: "description",
        content:
          "Browse branded apparel, bags, drinkware, technology and display products by SKU, MOQ and production time. Add items to your quote list.",
      },
      { property: "og:title", content: "All Promotional Products | Vibrand Barbados" },
      {
        property: "og:description",
        content: "Search the Vibrand catalogue and build a quote request in minutes.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const routeSearch = Route.useSearch();
  const rawPage = routeSearch.page ?? 1;
  const view = useCatalogView();
  const { search, toggle, clear, update, activeCount } = useCatalogFilters();
  const products = useCatalogProducts();
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const shipping = useShippingSettings();
  const isDesktop = useIsDesktop();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allProducts = products.data ?? [];
  const allCategories = categories.data ?? [];
  const allSubcategories = subcategories.data ?? [];

  const filtered = useMemo(
    () =>
      sortProducts(
        filterProducts(allProducts, search, {
          categories: allCategories,
          subcategories: allSubcategories,
          shipping,
        }),
        search.sort,
      ),
    [allProducts, allCategories, allSubcategories, search, shipping],
  );

  const total = filtered.length;
  warnInvisibleFilter("/products", total, allProducts.length, activeCount + (search.q ? 1 : 0));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  // Expanded view is desktop-only; prices are fetched for the visible page only.
  const expanded = isDesktop && view === "expanded";
  const pricingById = useCustomerPricing(
    visible.map((product) => product.id),
    expanded,
  );

  const chips = (
    ["cat", "sub", "moq", "prod", "colour", "deco", "src", "mat"] as FilterGroupId[]
  ).flatMap((group) =>
    search[group].map((value: string) => ({
      group,
      value,
      label:
        group === "cat"
          ? (allCategories.find((c) => c.slug === value)?.name ?? value)
          : group === "sub"
            ? (allSubcategories.find((s) => s.slug === value)?.name ?? value)
            : value,
    })),
  );

  const panelProps = {
    products: allProducts,
    categories: allCategories,
    subcategories: allSubcategories,
    search,
    resultCount: total,
    onToggle: toggle,
    onClear: clear,
    activeCount,
  };

  return (
    <SiteLayout>
      <div className="site-container xl:max-w-[1344px] py-6 pb-28 lg:py-8 lg:pb-16">
        <h1 className="sr-only">All Vibrand promotional products</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-6 xl:gap-8">
          <aside className="hidden w-[240px] shrink-0 lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
              <FilterPanel {...panelProps} variant="sidebar" />
            </div>
          </aside>

          <div className="@container min-w-0 flex-1">
            <div className="flex items-center justify-end gap-2">
              {isDesktop ? <ViewToggle /> : null}
              <Select value={search.sort} onValueChange={(value) => update({ sort: value })}>
                <SelectTrigger className="h-10 w-40 rounded-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chips.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={`${chip.group}-${chip.value}`}
                    type="button"
                    onClick={() => toggle(chip.group, chip.value)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-3 py-1.5 text-xs font-medium text-n-700 hover:bg-lime-300"
                  >
                    <span className="text-n-700/70">{GROUP_LABELS[chip.group]}:</span>
                    {chip.label}
                    <X className="size-3" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-semibold text-navy-500 hover:text-navy-700 hover:underline"
                >
                  Clear all
                </button>
              </div>
            ) : null}

            {products.isLoading ? (
              <div className="product-grid mt-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-[3/4] w-full rounded-2xl" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="mt-16 text-center">
                <p className="text-muted-foreground">No products match your filters.</p>
                <Button
                  variant="outline"
                  className="mt-4 border-n-200 text-navy-700 hover:bg-navy-50"
                  onClick={clear}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <p className="mt-4 text-xs text-muted-foreground">
                  {`Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} products`}
                </p>
                {expanded ? (
                  <div className="mt-2 flex flex-col gap-4">
                    {visible.map((product) => (
                      <ProductExpandedCard
                        key={product.id}
                        product={product}
                        pricing={pricingById.get(product.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="product-grid mt-2">
                    {visible.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </>
            )}

            {totalPages > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => update({ page: page + 1 })}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FilterBar
        activeCount={activeCount}
        onOpenFilters={() => setFiltersOpen(true)}
        suppressed={filtersOpen}
      />

      <FilterSheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <FilterPanel {...panelProps} variant="drawer" onClose={() => setFiltersOpen(false)} />
      </FilterSheet>
    </SiteLayout>
  );
}
