import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { allProductsQuery, categoriesQuery } from "@/lib/catalog";
import { quoteRequestsQuery } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Vibrand Staff" },
      { name: "description", content: "Overview of Vibrand products, categories and quote requests." },
      { property: "og:title", content: "Admin Dashboard | Vibrand Staff" },
      { property: "og:description", content: "Vibrand staff dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const products = useQuery(allProductsQuery);
  const categories = useQuery(categoriesQuery);
  const quotes = useQuery(quoteRequestsQuery);

  const loading = products.isLoading || categories.isLoading || quotes.isLoading;
  const newQuotes = (quotes.data ?? []).filter((quote) => quote.status === "new").length;

  const stats = [
    { label: "Active products", value: (products.data ?? []).filter((p) => p.is_active).length },
    { label: "Total products", value: (products.data ?? []).length },
    { label: "Categories", value: (categories.data ?? []).length },
    { label: "New quote requests", value: newQuotes },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">A quick snapshot of the catalogue and enquiries.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))
          : stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-primary">{stat.value}</p>
              </div>
            ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Latest quote requests</h2>
        <ul className="mt-4 divide-y divide-border">
          {(quotes.data ?? []).slice(0, 5).map((quote) => (
            <li key={quote.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{quote.company}</p>
                <p className="text-sm text-muted-foreground">
                  {quote.customer_name} · {quote.territory}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                {quote.status}
              </span>
            </li>
          ))}
          {!loading && (quotes.data ?? []).length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">No requests yet.</li>
          ) : null}
        </ul>
        <Link to="/admin/quotes" className="mt-4 inline-block text-sm font-semibold text-primary">
          View all requests →
        </Link>
      </div>
    </div>
  );
}