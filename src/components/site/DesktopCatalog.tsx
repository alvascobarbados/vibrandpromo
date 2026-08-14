import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/site/ProductCard";
import { Pricelist } from "@/components/team/Pricelist";
import { DesktopFilterSidebar } from "@/components/site/DesktopFilterSidebar";
import { categoriesQuery, subcategoriesQuery } from "@/lib/catalog";
import { useCatalogProducts } from "@/lib/staff-session";
import {
  GROUP_LABELS,
  SORT_OPTIONS,
  filterProducts,
  sortProducts,
  type CatalogSearch,
  type FilterGroupId,
} from "@/lib/catalog-filters";
import { useCatalogFilters } from "@/lib/use-catalog-filters";
import { useShippingSettings } from "@/lib/shipping";
import { useViewMode } from "@/lib/view-mode";
import { READY_FILTER_OPTIONS, matchesReadyFilter } from "@/lib/costing-gate";
import { sourcingRowsQuery } from "@/lib/sourcing";

const PAGE_SIZE = 20;
const CHIP_GROUPS: FilterGroupId[] = ["cat", "sub", "moq", "prod", "colour", "deco", "src", "mat"];

/**
 * Desktop-only (>=1024px) sidebar catalog. Shared by the home route and
 * /c/{slug}, which simply preselects its category in the sidebar.
 */
export function DesktopCatalog({
  initialCategorySlug,
  page: rawPage = 1,
}: {
  initialCategorySlug?: string;
  page?: number;
}) {
  const { search, toggle, clear, update, activeCount } = useCatalogFilters();
  const products = useCatalogProducts();
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const shipping = useShippingSettings();
  const preselected = useRef(false);
  /** /team lists one landscape row per product; the shop keeps its portrait grid. */
  const team = useViewMode() === "supplier";
  /** Staff-only sourcing rows feed the costing gate; never fetched in the shop. */
  const sourcing = useQuery({ ...sourcingRowsQuery, enabled: team });
  const sourcingByProduct = useMemo(
    () => new Map((sourcing.data ?? []).map((row) => [row.product_id, row] as const)),
    [sourcing.data],
  );

  const allProducts = products.data ?? [];
  const allCategories = categories.data ?? [];
  const allSubcategories = subcategories.data ?? [];

  useEffect(() => {
    if (preselected.current || !initialCategorySlug) return;
    preselected.current = true;
    if (search.cat.length === 0) update({ cat: [initialCategorySlug] }, { replace: true });
  }, [initialCategorySlug, search.cat.length, update]);

  const selectedCategory = search.cat[0] ?? null;

  function selectCategory(slug: string | null) {
    const patch: Partial<CatalogSearch> = slug
      ? { cat: [slug], sub: [] }
      : { cat: [], sub: [], colour: [], deco: [], mat: [] };
    update(patch);
  }

  const filtered = useMemo(() => {
    const base = filterProducts(allProducts, search, {
      categories: allCategories,
      subcategories: allSubcategories,
      shipping,
    });
    /** The costing gate is a /team filter only — the shop list is untouched. */
    const gated = team
      ? base.filter((product) =>
          matchesReadyFilter(
            search.ready,
            product,
            sourcingByProduct.get(product.id) ?? null,
          ),
        )
      : base;
    return sortProducts(gated, search.sort);
  }, [allProducts, allCategories, allSubcategories, search, shipping, team, sourcingByProduct]);

  const readyCounts = useMemo(() => {
    const counts: Record<string, number> = { ready: 0, incomplete: 0 };
    if (!team) return counts;
    const base = filterProducts(allProducts, search, {
      categories: allCategories,
      subcategories: allSubcategories,
      shipping,
    });
    for (const option of READY_FILTER_OPTIONS) {
      counts[option.value] = base.filter((product) =>
        matchesReadyFilter([option.value], product, sourcingByProduct.get(product.id) ?? null),
      ).length;
    }
    return counts;
  }, [team, allProducts, allCategories, allSubcategories, search, shipping, sourcingByProduct]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const chips = CHIP_GROUPS.flatMap((group) =>
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

  const readyChips = team
    ? search.ready.map((value) => ({
        value,
        label: READY_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? value,
      }))
    : [];

  const toggleReady = (value: string) =>
    update({
      ready: search.ready.includes(value)
        ? search.ready.filter((item) => item !== value)
        : [...search.ready, value],
    });

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-6 xl:gap-8">
      <aside className={`w-[240px] shrink-0 ${team ? "hidden lg:block" : ""}`}>
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <DesktopFilterSidebar
            products={allProducts}
            categories={allCategories}
            subcategories={allSubcategories}
            search={search}
            selectedCategory={selectedCategory}
            onSelectCategory={selectCategory}
            onToggle={toggle}
            onClear={clear}
            activeCount={activeCount}
            ready={team ? { counts: readyCounts, onToggle: toggleReady } : undefined}
          />
        </div>
      </aside>

      <div className="@container min-w-0 flex-1">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {total ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} products` : "No products"}
          </p>
          <Select value={search.sort} onValueChange={(value) => update({ sort: value })}>
            <SelectTrigger className="h-10 w-44 rounded-full">
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

        {chips.length || readyChips.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {readyChips.map((chip) => (
              <button
                key={`ready-${chip.value}`}
                type="button"
                onClick={() => toggleReady(chip.value)}
                className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-3 py-1.5 text-xs font-medium text-n-700 hover:bg-lime-300"
              >
                <span className="text-n-700/70">Costing status:</span>
                {chip.label}
                <X className="size-3" />
              </button>
            ))}
            {chips.map((chip) => (
              <button
                key={`${chip.group}-${chip.value}`}
                type="button"
                onClick={() =>
                  chip.group === "cat" ? selectCategory(null) : toggle(chip.group, chip.value)
                }
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
          <div className={team ? "mt-4 flex flex-col gap-3" : "product-grid mt-4"}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className={team ? "h-[180px] w-full rounded-2xl" : "aspect-[3/4] w-full rounded-2xl"}
              />
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
        ) : team ? (
          <Pricelist
            products={visible}
            categories={allCategories}
            subcategories={allSubcategories}
          />
        ) : (
          <div className={team ? "mt-4 flex flex-col gap-3" : "product-grid mt-4"}>
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
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
  );
}
