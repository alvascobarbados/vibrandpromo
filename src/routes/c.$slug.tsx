import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import {
  categoriesQuery,
  publicProductsQuery,
  subcategoriesQuery,
  type Product,
} from "@/lib/catalog";

export const Route = createFileRoute("/c/$slug")({
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
  const products = useQuery(publicProductsQuery);
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const [activeChip, setActiveChip] = useState("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const category = (categories.data ?? []).find((c) => c.slug === slug);
  const loading = products.isLoading || categories.isLoading || subcategories.isLoading;

  if (!loading && !category) throw notFound();

  const sections = useMemo(() => {
    if (!category) return [] as { id: string; slug: string; name: string; items: Product[] }[];
    const inCategory = (products.data ?? []).filter((p) => p.category_id === category.id);
    const bySub = new Map<string, Product[]>();
    for (const product of inCategory) {
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
  }, [category, products.data, subcategories.data]);

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

  const total = sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <SiteLayout>
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3">
            <Link
              to="/"
              aria-label="Back to categories"
              className="rounded-full p-1.5 text-charcoal hover:bg-muted"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <h1 className="font-display text-lg font-bold text-foreground">
              {category?.name ?? "Category"}
            </h1>
            {total ? (
              <span className="text-sm text-muted-foreground">
                {total} item{total === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          {sections.length ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ slug: "all", name: "All" }, ...sections].map((chip) => (
                <button
                  key={chip.slug}
                  type="button"
                  onClick={() => scrollToSection(chip.slug)}
                  aria-current={activeChip === chip.slug}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    activeChip === chip.slug
                      ? "border-lime bg-lime text-lime-foreground"
                      : "border-border bg-card text-charcoal hover:bg-muted"
                  }`}
                >
                  {chip.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div id="category-top" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No products in this category yet.
          </p>
        ) : (
          <div className="space-y-10">
            {sections.map((section) => (
              <section
                key={section.id}
                data-sub={section.slug}
                ref={(node) => {
                  sectionRefs.current[section.slug] = node;
                }}
                className="scroll-mt-40"
              >
                <h2 className="font-display text-base font-bold text-foreground">{section.name}</h2>
                <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {section.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
