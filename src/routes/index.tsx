import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import { CatalogHome } from "@/components/site/CatalogHome";
import { parseCatalogSearch, type CatalogSearch } from "@/lib/catalog-filters";

export const Route = createFileRoute("/")({
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
  head: () => ({
    meta: [
      { title: "Promotional Products by Category | Vibrand Barbados" },
      {
        name: "description",
        content:
          "Browse Vibrand promotional products by category — apparel, bags, drinkware, barware, display, technology and more. Add items to your quote list.",
      },
      { property: "og:title", content: "Promotional Products by Category | Vibrand Barbados" },
      {
        property: "og:description",
        content: "Browse Vibrand promotional products by category — apparel, bags, drinkware, barware, display, technology and more. Add items to your quote list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const page = Route.useSearch().page ?? 1;
  return <CatalogHome page={page} />;
}
