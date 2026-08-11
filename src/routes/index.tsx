import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
import { FilterPanel } from "@/components/site/FilterPanel";
import { categoriesQuery, publicProductsQuery } from "@/lib/catalog";
import {
  GROUP_LABELS,
  SORT_OPTIONS,
  activeFilterCount,
  filterProducts,
  parseCatalogSearch,
  sortProducts,
  type CatalogSearch,
  type FilterGroupId,
} from "@/lib/catalog-filters";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...parseCatalogSearch(search),
    page: Number(search['page']) > 0 ? Number(search['page']) : 1,
  }),
  head: () => ({
    meta: [
      { title: "Promotional Products Catalogue | Alvasco Barbados" },
      {
        name: "description",
        content:
          "Browse branded apparel, bags, drinkware, technology and display products by SKU, MOQ and production time. Add items to your quote list.",
      },
      { property: "og:title", content: "Promotional Products Catalogue | Alvasco Barbados" },
      {
        property: "og:description",
        content: "Search the Alvasco catalogue and build a quote request in minutes.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const search = Route.useSearch() as CatalogSearch & { page: number };
  const navigate = useNavigate({ from: "/" });
  const products = useQuery(publicProductsQuery);
  const categories = useQuery(categoriesQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allProducts = products.data ?? [];
  const allCategories = categories.data ?? [];

  const filtered = useMemo(
    () => sortProducts(filterProducts(allProducts, search, allCategories), search.sort),
    [allProducts, allCategories, search],
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, search.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  function update(patch: Partial<CatalogSearch & { page: number }>, replace = false) {
    void navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, page: 1, ...patch }),
      replace,
      resetScroll: false,
    });
  }

  function toggle(group: FilterGroupId, value: string) {
    const current = search[group];
    const next = current.includes(value)
      ? current.filter((item: string) => item !== value)
      : [...current, value];
    update({ [group]: next } as Partial<CatalogSearch>);
  }

  function clearFilters() {
    update({ cat: [], moq: [], prod: [], colour: [], deco: [], src: [], mat: [] });
  }

  const chips = (["cat", "moq", "prod", "colour", "deco", "src", "mat"] as FilterGroupId[]).flatMap(
    (group) =>
      search[group].map((value: string) => ({
        group,
        value,
        label:
          group === "cat"
            ? (allCategories.find((c) => c.slug === value)?.name ?? value)
            : value,
      })),
  );

  const searchField = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search.q}
        onChange={(event) => update({ q: event.target.value }, true)}
        placeholder="Product name / SKU"
        aria-label="Search products by name or SKU"
        className="h-10 rounded-full pl-9"
      />
    </div>
  );

  return (
    <SiteLayout headerSlot={<div className="hidden sm:block">{searchField}</div>}>
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
        <h1 className="sr-only">Alvasco promotional products catalogue</h1>

        <div className="sm:hidden">{searchField}</div>

        <div className="mt-3 lg:hidden">
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            Show Filters
            {activeFilterCount(search) ? ` (${activeFilterCount(search)})` : ""}
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-8 lg:flex-row">
          <aside className="hidden w-64 shrink-0 lg:block">
            <FilterPanel
              variant="sidebar"
              products={allProducts}
              categories={allCategories}
              search={search}
              resultCount={total}
              onToggle={toggle}
              onClear={clearFilters}
            />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {total === 0
                  ? "Showing 0 products"
                  : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} products`}
              </p>
              <Select value={search.sort} onValueChange={(value) => update({ sort: value })}>
                <SelectTrigger className="w-44">
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <span className="text-muted-foreground">{GROUP_LABELS[chip.group]}:</span>
                    {chip.label}
                    <X className="size-3" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            ) : null}

            {products.isLoading ? (
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="mt-16 text-center text-muted-foreground">
                No products match your search.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-3">
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

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <FilterPanel
            variant="drawer"
            products={allProducts}
            categories={allCategories}
            search={search}
            resultCount={total}
            onToggle={toggle}
            onClear={clearFilters}
            onClose={() => setFiltersOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </SiteLayout>
  );
}
