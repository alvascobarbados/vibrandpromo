import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
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
import { ViewToggle, useCatalogView } from "@/components/site/ViewToggle";
import { Pricelist } from "@/components/team/Pricelist";
import { DesktopFilterSidebar } from "@/components/site/DesktopFilterSidebar";
import { categoriesQuery, subcategoriesQuery } from "@/lib/catalog";
import { useCatalogProducts, useStaffSession } from "@/lib/staff-session";
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
import { sourcingRowsQuery, suppliersQuery } from "@/lib/sourcing";
import { useCustomerPricing } from "@/lib/customer-pricing";
import type { Incoterm } from "@/lib/pricing-types";

const PAGE_SIZE = 20;
const CHIP_GROUPS: FilterGroupId[] = ["cat", "sub", "moq", "prod", "colour", "deco", "src", "mat"];
const INCOTERMS: Incoterm[] = ["CIF", "FOB", "LDF", "LDP"];

/**
 * Desktop-only (>=1024px) sidebar catalog. Shared by the home route and
 * /c/{slug}, which simply preselects its category in the sidebar.
 */
export function DesktopCatalog({
  initialCategorySlug,
  page: rawPage = 1,
  picker,
}: {
  initialCategorySlug?: string;
  page?: number;
  /**
   * Proposal picker context. When absent (every shop surface) the catalog
   * behaves exactly as before.
   */
  picker?: {
    selectedIds: Set<string>;
    onToggle: (productId: string) => void;
    busyId?: string | null;
    /** Locked project incoterm — replaces the staff incoterm toggle. */
    incoterm?: Incoterm;
  };
}) {
  const { search, toggle, clear, update, activeCount } = useCatalogFilters();
  /** /team lists one landscape row per product; the shop keeps its portrait grid. */
  const team = useViewMode() === "supplier" && !picker;
  /** /team is the staff work surface — it always reads draft + live. */
  const products = useCatalogProducts({ includeDrafts: team || Boolean(picker) });
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const shipping = useShippingSettings();
  const preselected = useRef(false);
  /** Staff-only sourcing rows feed the costing gate; never fetched in the shop. */
  const sourcing = useQuery({ ...sourcingRowsQuery, enabled: team });
  const sourcingByProduct = useMemo(
    () => new Map((sourcing.data ?? []).map((row) => [row.product_id, row] as const)),
    [sourcing.data],
  );
  /** Staff-only supplier list; never fetched in the customer shop. */
  const suppliers = useQuery({ ...suppliersQuery, enabled: team });

  /** Supplier CODE for a product ("none" when unassigned). */
  const supplierCodeOf = useMemo(() => {
    const byId = new Map((suppliers.data ?? []).map((s) => [s.id, s.code] as const));
    return (productId: string) => {
      const row = sourcingByProduct.get(productId);
      const code = row?.supplier_id ? byId.get(row.supplier_id) : null;
      return code ?? "none";
    };
  }, [suppliers.data, sourcingByProduct]);

  const matchesSupplier = (productId: string, values: string[]) =>
    values.length === 0 || values.includes(supplierCodeOf(productId));

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
          matchesReadyFilter(search.ready, product, sourcingByProduct.get(product.id) ?? null) &&
          matchesSupplier(product.id, search.sup),
        )
      : base;
    return sortProducts(gated, search.sort);
  }, [
    allProducts,
    allCategories,
    allSubcategories,
    search,
    shipping,
    team,
    sourcingByProduct,
    supplierCodeOf,
  ]);

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

  /** Supplier rail options: counted on the list minus the supplier group itself. */
  const supplierOptions = useMemo(() => {
    if (!team) return [];
    const base = filterProducts(allProducts, search, {
      categories: allCategories,
      subcategories: allSubcategories,
      shipping,
    }).filter((product) =>
      matchesReadyFilter(search.ready, product, sourcingByProduct.get(product.id) ?? null),
    );
    const counts = new Map<string, number>();
    for (const product of base) {
      const code = supplierCodeOf(product.id);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    const named = (suppliers.data ?? [])
      .map((s) => ({ value: s.code, label: s.name, count: counts.get(s.code) ?? 0 }))
      .filter((option) => option.count > 0 || search.sup.includes(option.value))
      .sort((a, b) => a.label.localeCompare(b.label));
    const unassignedCount = counts.get("none") ?? 0;
    return unassignedCount > 0 || search.sup.includes("none")
      ? [...named, { value: "none", label: "Unassigned", count: unassignedCount }]
      : named;
  }, [
    team,
    allProducts,
    allCategories,
    allSubcategories,
    search,
    shipping,
    sourcingByProduct,
    suppliers.data,
    supplierCodeOf,
  ]);

  const toggleSupplier = (value: string) =>
    update({
      sup: search.sup.includes(value)
        ? search.sup.filter((item) => item !== value)
        : [...search.sup, value],
    });

  const supplierChips = team
    ? search.sup.map((value) => ({
        value,
        label:
          value === "none"
            ? "Unassigned"
            : ((suppliers.data ?? []).find((s) => s.code === value)?.name ?? value),
      }))
    : [];

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  /** Expanded layout is a shop-only, desktop-only presentation choice. */
  const expanded = !team && useCatalogView() === "expanded";
  /**
   * Incoterm basis is a staff-only cost view on the shop surface. Non-staff
   * never see the control and the URL param is ignored for them, so the fetch
   * stays on the public CIF function no matter what the URL says.
   */
  const { isStaff } = useStaffSession();
  const showIncoterm = isStaff && !team && !picker;
  const rawInco = useRouterState({
    select: (state) => String((state.location.search as Record<string, unknown>)["inco"] ?? ""),
  }) as unknown as string;
  const incoterm: Incoterm = picker
    ? (picker.incoterm ?? "CIF")
    : showIncoterm && INCOTERMS.includes(rawInco as Incoterm)
      ? (rawInco as Incoterm)
      : "CIF";
  /** Both customer views price the visible page (20 ids ≤ the 60 server cap). */
  const pricingById = useCustomerPricing(
    visible.map((product) => product.id),
    !team,
    incoterm,
  );

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
      {/* Rail styling comes from the shared .filter-rail utilities so the shop
          sidebar and the /team rail can never drift apart. */}
      <aside className={`filter-rail w-[240px] shrink-0 ${team ? "hidden lg:block" : ""}`}>
        <div className="filter-rail-surface sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
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
            supplier={team ? { options: supplierOptions, onToggle: toggleSupplier } : undefined}
          />
        </div>
      </aside>

      <div className="@container min-w-0 flex-1">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {total
              ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} products`
              : "No products"}
          </p>
          <div className="flex items-center gap-2">
            {team ? null : <ViewToggle />}
            {showIncoterm ? (
              <Select
                value={incoterm}
                onValueChange={(value) =>
                  update({ inco: value === "CIF" ? undefined : value } as never)
                }
              >
                <SelectTrigger className="h-10 w-40 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOTERMS.map((option) => (
                    <SelectItem key={option} value={option}>
                      Incoterm: {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
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
        </div>

        {chips.length || readyChips.length || supplierChips.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {supplierChips.map((chip) => (
              <button
                key={`sup-${chip.value}`}
                type="button"
                onClick={() => toggleSupplier(chip.value)}
                className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-3 py-1.5 text-xs font-medium text-n-700 hover:bg-lime-300"
              >
                <span className="text-n-700/70">Supplier:</span>
                {chip.label}
                <X className="size-3" />
              </button>
            ))}
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
                className={
                  team ? "h-[180px] w-full rounded-2xl" : "aspect-[3/4] w-full rounded-2xl"
                }
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
        ) : expanded ? (
          <div className="mt-4 flex flex-col gap-4">
            {visible.map((product) => (
              <ProductCard
                viewMode="expanded"
                key={product.id}
                product={product}
                pricing={pricingById.get(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className={team ? "mt-4 flex flex-col gap-3" : "product-grid mt-4"}>
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                pricing={pricingById.get(product.id)}
                {...(picker
                  ? {
                      picker: {
                        selected: picker.selectedIds.has(product.id),
                        onToggle: () => picker.onToggle(product.id),
                        busy: picker.busyId === product.id,
                      },
                    }
                  : {})}
              />
            ))}
          </div>
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
  );
}
