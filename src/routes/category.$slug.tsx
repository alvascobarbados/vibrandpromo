import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { categoriesQuery, publicProductsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/category/$slug")({
  head: () => ({
    meta: [
      { title: "Product Category | Alvasco Promotional Products" },
      {
        name: "description",
        content:
          "Browse branded promotional products by category and add your favourites to an Alvasco quote request.",
      },
      { property: "og:title", content: "Product Category | Alvasco Promotional Products" },
      {
        property: "og:description",
        content: "Branded merchandise by category, quoted within 24 hours.",
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const categories = useQuery(categoriesQuery);
  const products = useQuery(publicProductsQuery);

  const category = (categories.data ?? []).find((item) => item.slug === slug);
  const items = (products.data ?? []).filter((item) => item.category_id === category?.id);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        {categories.isLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : category ? (
          <>
            <h1 className="text-3xl font-bold sm:text-4xl">{category.name}</h1>
            <p className="mt-3 text-muted-foreground">
              {items.length} product{items.length === 1 ? "" : "s"} available for branding.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Category not found</h1>
            <Button asChild className="mt-6">
              <Link to="/products">Browse all products</Link>
            </Button>
          </>
        )}

        {products.isLoading ? (
          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : category && items.length === 0 ? (
          <p className="mt-16 text-muted-foreground">
            Nothing listed here yet — <Link to="/quote" className="text-primary underline">ask us</Link>{" "}
            what's available.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}