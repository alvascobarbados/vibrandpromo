import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { categoriesQuery, publicProductsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Promotional Products Catalogue | Alvasco Barbados" },
      {
        name: "description",
        content:
          "Browse branded apparel, bags, drinkware, technology and display products. Add items to your quote list and we respond within 24 hours.",
      },
      { property: "og:title", content: "Promotional Products Catalogue | Alvasco Barbados" },
      {
        property: "og:description",
        content:
          "Explore the Alvasco catalogue of premium promotional products for Caribbean businesses.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const products = useQuery(publicProductsQuery);
  const categories = useQuery(categoriesQuery);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  const visible = useMemo(() => {
    const list = (products.data ?? []).filter((product) => {
      const matchesCategory = category === "all" || product.category_id === category;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
    return [...list].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [products.data, category, search, sort]);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold sm:text-4xl">All products</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Prices shown are indicative only. Add anything you like to your quote list and we'll come
          back with firm pricing.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories.data ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(categories.data ?? []).map((item) => (
            <Link
              key={item.id}
              to="/category/$slug"
              params={{ slug: item.slug }}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {products.isLoading ? (
          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">
            No products match your search yet.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}