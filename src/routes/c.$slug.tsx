import { createFileRoute, Link, notFound, stripSearchParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import {
  categoriesQuery,
  subcategoriesQuery,
  type Product,
} from "@/lib/catalog";
import { useCatalogProducts } from "@/lib/staff-session";
import { FilterPanel } from "@/components/site/FilterPanel";
import { FilterBar } from "@/components/site/FilterBar";
import {
  GROUP_LABELS,
  filterProducts,
  parseCatalogSearch,
  type CatalogSearch,
  type FilterGroupId,
} from "@/lib/catalog-filters";
import { useCatalogFilters } from "@/lib/use-catalog-filters";
import { useShippingSettings } from "@/lib/shipping";

export const Route = createFileRoute("/c/$slug")({
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
  head: ({ params }) => {
    const name = params.slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${name} | Vibrand Promotional Products` },
        {
          name: "description",
          content: `Browse branded ${name.toLowerCase()} by subcategory, MOQ and production time, and add items to your Vibrand quote list.`,
        },
        { property: "og:title", content: `${name} | Vibrand Promotional Products` },
        {
          property: "og:description",
          content: `Explore the Vibrand ${name.toLowerCase()} range and request a quote.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CategoryPage,
  errorComponent: () => (
    <SiteLayout>
      <p className="p-16 text-center text-muted-foreground">This category could not be loaded.</p>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <p className="p-16 text-center text-muted-foreground">Category not found.</p>
    </SiteLayout>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const products = useCatalogProducts();
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const shipping = useShippingSettings();
  const { search, scope, setScope, toggle, clear, activeCount } = useCatalogFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeChip, setActiveChip] = useState("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const category = (categories.data ?? []).find((c) => c.slug === slug);
  const loading = products.isLoading || categories.isLoading || subcategories.isLoading;

  const inCategory = useMemo(
    () => (products.data ?? []).filter((p) => p.category_id === category?.id),
    [products.data, category?.id],
  );

  const matching = useMemo(
    () =>
      filterProducts(inCategory, search, {
        categories: categories.data ?? [],
        subcategories: subcategories.data ?? [],
        shipping,
      }),
    [inCategory, search, categories.data, subcategories.data, shipping],
  );

  const sections = useMemo(() => {
    if (!category) return [] as { id: string; slug: string; name: string; items: Product[] }[];
    const bySub = new Map<string, Product[]>();
    for (const product of matching) {
      const key = product.subcategory_id ?? "none";
      const list = bySub.get(key) ?? [];
      list.push(product);
      bySub.set(key, list);
    }
    return (subcategories.data ?? [])
      .filter((sub) => sub.category_id === category.id)
      .map((sub) => ({
        id: sub.id,
        slug: sub.slug,
        name: sub.name,
        items: bySub.get(sub.id) ?? [],
      }))
      .filter((section) => section.items.length > 0);
  }, [category, matching, subcategories.data]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target instanceof HTMLElement) {
          setActiveChip(visible.target.dataset['sub'] ?? "all");
        }
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: 0 },
    );
    for (const node of Object.values(sectionRefs.current)) {
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [sections]);

  function scrollToSection(target: string) {
    setActiveChip(target);
    const node =
      target === "all"
        ? document.getElementById("category-top")
        : sectionRefs.current[target];
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const chips = (
    ["sub", "moq", "prod", "colour", "deco", "src", "mat"] as FilterGroupId[]
  ).flatMap((group) =>
    search[group].map((value: string) => ({
      group,
      value,
      label:
        group === "sub"
          ? ((subcategories.data ?? []).find((sub) => sub.slug === value)?.name ?? value)
          : value,
    })),
  );

  const total = sections.reduce((sum, section) => sum + section.items.length, 0);

  if (!loading && !category) throw notFound();

  return (
    <SiteLayout>
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="site-container">
          <div className="flex items-center gap-2 py-3">
            <Link
              to="/"
              aria-label="Back to categories"
              className="rounded-full p-1.5 text-navy-700 hover:bg-navy-50"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <h1 className="font-display text-[20px] font-semibold leading-[1.3] text-foreground lg:text-[24px]">
              {category?.name ?? "Category"}
            </h1>
            {total ? (
              <span className="text-sm text-muted-foreground">
                {total} item{total === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          {sections.length ? (
            <div className="site-scroller flex gap-2 pb-3">
              {[{ slug: "all", name: "All" }, ...sections].map((chip) => (
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
          ) : null}
        </div>
      </div>

      <div id="category-top" className="site-container py-6 pb-28 lg:py-8 lg:pb-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="hidden w-[250px] shrink-0 lg:block">
            <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto pr-2">
              <FilterPanel
                variant="sidebar"
                products={inCategory}
                categories={categories.data ?? []}
                subcategories={subcategories.data ?? []}
                search={search}
                resultCount={matching.length}
                scope={scope}
                onScope={setScope}
                onToggle={toggle}
                onClear={clear}
                activeCount={activeCount}
                {...(category ? { fixedCategoryId: category.id } : {})}
              />
            </div>
          </aside>

          <div className="@container min-w-0 flex-1">
        {chips.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
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
        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[3/4] w-full rounded-2xl" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">
              {activeCount ? "No products match your filters." : "No products in this category yet."}
            </p>
            {activeCount ? (
              <button
                type="button"
                onClick={clear}
                className="mt-4 rounded-full border border-n-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-10 lg:space-y-16">
            {sections.map((section) => (
              <section
                key={section.id}
                data-sub={section.slug}
                ref={(node) => {
                  sectionRefs.current[section.slug] = node;
                }}
                className="scroll-mt-40"
              >
                <h2 className="font-display text-[20px] font-semibold leading-[1.3] text-foreground lg:text-[24px]">
                  {section.name}
                </h2>
                <div className="product-grid mt-4 lg:mt-5">
                  {section.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
          </div>
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
            products={inCategory}
            categories={categories.data ?? []}
            subcategories={subcategories.data ?? []}
            search={search}
            resultCount={matching.length}
            scope={scope}
            onScope={setScope}
            onToggle={toggle}
            onClear={clear}
            activeCount={activeCount}
            {...(category ? { fixedCategoryId: category.id } : {})}
            onClose={() => setFiltersOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </SiteLayout>
  );
}
