import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, PackageSearch, Sparkles, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { categoriesQuery, publicProductsQuery } from "@/lib/catalog";
import heroImage from "@/assets/hero-products.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alvasco Barbados | Premium Promotional Products & Corporate Gifts" },
      {
        name: "description",
        content:
          "Caribbean-based supplier of branded apparel, drinkware, bags, tech and corporate gifts. Browse the catalogue and request a quote within 24 hours.",
      },
      {
        property: "og:title",
        content: "Alvasco Barbados | Premium Promotional Products & Corporate Gifts",
      },
      {
        property: "og:description",
        content:
          "Branded merchandise for Caribbean businesses — apparel, drinkware, bags, tech and more.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    icon: PackageSearch,
    title: "Browse the catalogue",
    body: "Explore hundreds of brandable products across ten product families.",
  },
  {
    icon: ClipboardList,
    title: "Build a quote list",
    body: "Add quantities and branding notes. No cart, no checkout, no obligation.",
  },
  {
    icon: Sparkles,
    title: "We quote in 24 hours",
    body: "Our team confirms pricing, decoration methods and artwork proofs.",
  },
  {
    icon: Truck,
    title: "Produced & delivered",
    body: "Regional logistics across Barbados and the wider Caribbean.",
  },
];

function Index() {
  const categories = useQuery(categoriesQuery);
  const products = useQuery(publicProductsQuery);
  const featured = (products.data ?? []).filter((item) => item.is_featured).slice(0, 8);
  const showcase = featured.length ? featured : (products.data ?? []).slice(0, 8);

  return (
    <SiteLayout>
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
              Barbados · Caribbean-wide delivery
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Promotional products your brand deserves
            </h1>
            <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
              Alvasco supplies premium branded apparel, drinkware, bags, technology and corporate
              gifts to businesses across the region. Build a quote list and we'll price it within 24
              hours.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/products">
                  Browse catalogue <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/quote">Request a quote</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl shadow-lift">
            <img
              src={heroImage}
              alt="Flat lay of branded corporate merchandise including apparel, drinkware and notebooks"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Shop by category</h2>
            <p className="mt-2 text-muted-foreground">Ten families of brandable products.</p>
          </div>
          <Link to="/products" className="text-sm font-semibold text-primary hover:underline">
            View everything
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.isLoading
            ? Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-2xl" />
              ))
            : (categories.data ?? []).map((category) => (
                <Link
                  key={category.id}
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="group flex h-28 items-end rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lift"
                >
                  <span className="font-semibold group-hover:text-primary">{category.name}</span>
                </Link>
              ))}
        </div>
      </section>

      <section className="bg-secondary py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.title} className="rounded-2xl border border-border bg-card p-6">
                <step.icon className="size-7 text-primary" />
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold">Featured products</h2>
          <Link to="/products" className="text-sm font-semibold text-primary hover:underline">
            See all products
          </Link>
        </div>
        {products.isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {showcase.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-gradient-primary">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
            Ready to brand something great?
          </h2>
          <p className="max-w-2xl text-primary-foreground/85">
            Tell us what you need — quantities, deadlines, artwork — and we'll handle the rest.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/quote">Start your quote</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
