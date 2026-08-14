import { requirePage } from "@/lib/admin-guard";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteDetailDrawer } from "@/components/admin/QuoteDetailDrawer";
import { useIsDesktop } from "@/hooks/use-desktop";
import { supabase } from "@/integrations/supabase/client";
import { usePrefValue } from "@/lib/user-prefs";
import {
  QUOTE_STATUSES,
  quoteProductsQuery,
  quoteRequestItemsQuery,
  quoteRequestsQuery,
  type QuoteRequest,
  type QuoteRequestItem,
} from "@/lib/admin";

const STATUS_BADGE: Record<string, string> = {
  new: "bg-lime-500 text-n-700",
  in_progress: "bg-navy-500 text-white",
  quoted: "bg-success text-success-foreground",
  closed: "bg-n-500 text-white",
};

const PAGE_SIZE = 50;

type SortKey = "created_at" | "customer_name" | "company" | "status";

type OptionalColumn = "email" | "phone" | "submitted";

const OPTIONAL_COLUMNS: { id: OptionalColumn; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "submitted", label: "Submitted date" },
];

const LEGACY_COLUMN_PREFS_KEY = "vibrand.admin.quotes.columns";

const DEFAULT_OPTIONAL: Record<OptionalColumn, boolean> = {
  email: false,
  phone: false,
  submitted: false,
};

function sanitizeOptional(raw: unknown): Record<OptionalColumn, boolean> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Partial<Record<OptionalColumn, unknown>>;
  return {
    email: value.email === true,
    phone: value.phone === true,
    submitted: value.submitted === true,
  };
}

function relativeAge(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}d`;
  return `${Math.floor(days / 30)}mo`;
}

function statusLabel(status: string) {
  return status.replace("_", " ");
}

export const Route = createFileRoute("/_authenticated/admin/quotes")({
  beforeLoad: ({ context }) => requirePage(context.access, "quotes"),
  head: () => ({
    meta: [
      { title: "Quote Requests | Vibrand Admin" },
      { name: "description", content: "Review and manage customer quote requests." },
      { property: "og:title", content: "Quote Requests | Vibrand Admin" },
      { property: "og:description", content: "Manage Vibrand quote requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminQuotes,
});

function AdminQuotes() {
  const queryClient = useQueryClient();
  const quotes = useQuery(quoteRequestsQuery);
  const items = useQuery(quoteRequestItemsQuery);
  const products = useQuery(quoteProductsQuery);
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const raw = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [optional, setOptional] = usePrefValue<Record<OptionalColumn, boolean>>(
    "quotes_table",
    "columns",
    DEFAULT_OPTIONAL,
    sanitizeOptional,
    LEGACY_COLUMN_PREFS_KEY,
  );

  function toggleOptional(id: OptionalColumn) {
    setOptional({ ...optional, [id]: !optional[id] });
  }

  const search = typeof raw["q"] === "string" ? (raw["q"] as string) : "";
  const filter = typeof raw["status"] === "string" ? (raw["status"] as string) : "all";
  const sort = (typeof raw["sort"] === "string" ? raw["sort"] : "created_at") as SortKey;
  const dir = raw["dir"] === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(raw["page"] ?? 1) || 1);

  const go = (patch: Record<string, string | number | undefined>) => {
    const next: Record<string, unknown> = { ...raw, ...patch };
    for (const key of Object.keys(next)) {
      const value = next[key];
      if (value === undefined || value === "" || value === "all" || value === 1) delete next[key];
    }
    void navigate({ search: next as never, replace: true, resetScroll: false } as never);
  };

  const productsById = useMemo(
    () => new Map((products.data ?? []).map((product) => [product.id, product])),
    [products.data],
  );

  const itemsByQuote = useMemo(() => {
    const map = new Map<string, QuoteRequestItem[]>();
    for (const item of items.data ?? []) {
      const list = map.get(item.quote_request_id) ?? [];
      list.push(item);
      map.set(item.quote_request_id, list);
    }
    return map;
  }, [items.data]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const quote of quotes.data ?? []) counts[quote.status] = (counts[quote.status] ?? 0) + 1;
    return counts;
  }, [quotes.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (quotes.data ?? []).filter((quote) => {
      if (filter !== "all" && quote.status !== filter) return false;
      if (!term) return true;
      const skus = (itemsByQuote.get(quote.id) ?? [])
        .map((item) =>
          [item.product_name, item.product_id ? productsById.get(item.product_id)?.sku ?? "" : ""].join(
            " ",
          ),
        )
        .join(" ");
      return `${quote.customer_name} ${quote.company} ${quote.email} ${quote.phone ?? ""} ${quote.territory} ${skus}`
        .toLowerCase()
        .includes(term);
    });
  }, [quotes.data, filter, search, itemsByQuote, productsById]);

  const sorted = useMemo(() => {
    const list = [...filtered].sort((a, b) => {
      if (sort === "created_at") return a.created_at.localeCompare(b.created_at);
      return String(a[sort]).localeCompare(String(b[sort]), undefined, { sensitivity: "base" });
    });
    return dir === "asc" ? list : list.reverse();
  }, [filtered, sort, dir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const filteredCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const quote of sorted) counts[quote.status] = (counts[quote.status] ?? 0) + 1;
    return counts;
  }, [sorted]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "quote_requests"] });
    },
    onError: () => toast.error("Could not update status"),
  });

  function toggleSort(key: SortKey) {
    if (key === sort) go({ dir: dir === "asc" ? "desc" : "asc", page: 1 });
    else go({ sort: key === "created_at" ? undefined : key, dir: "desc", page: 1 });
  }

  function StatusChip({ quote, className = "" }: { quote: QuoteRequest; className?: string }) {
    return (
      <Select
        value={quote.status}
        onValueChange={(status) => updateStatus.mutate({ id: quote.id, status })}
      >
        <SelectTrigger
          onClick={(event) => event.stopPropagation()}
          className={`h-6 w-fit gap-1 rounded-full border-0 px-2.5 py-0 text-[11px] font-bold uppercase tracking-wide shadow-none focus:ring-0 focus:ring-offset-0 ${STATUS_BADGE[quote.status] ?? "bg-n-500 text-white"} ${className}`}
        >
          {statusLabel(quote.status)}
        </SelectTrigger>
        <SelectContent>
          {QUOTE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const selectedQuote = (quotes.data ?? []).find((quote) => quote.id === selected) ?? null;

  type Column = {
    id: string;
    label: string;
    sortKey?: SortKey;
    align?: "right";
    className?: string;
    cellClassName?: string;
    cell: (quote: QuoteRequest) => React.ReactNode;
  };

  const columns: Column[] = [
    {
      id: "age",
      label: "Age",
      sortKey: "created_at",
      className: "w-[70px]",
      cellClassName: "whitespace-nowrap text-n-500",
      cell: (quote) => relativeAge(quote.created_at),
    },
    {
      id: "company",
      label: "Company",
      sortKey: "company",
      cellClassName: "font-medium text-n-900",
      cell: (quote) => (
        <>
          {quote.status === "new" ? (
            <span className="mr-2 inline-block size-1.5 rounded-full bg-lime-500 align-middle" />
          ) : null}
          {quote.company}
        </>
      ),
    },
    {
      id: "customer_name",
      label: "Contact name",
      sortKey: "customer_name",
      cellClassName: "text-n-500",
      cell: (quote) => quote.customer_name,
    },
    {
      id: "territory",
      label: "Territory",
      className: "w-[110px]",
      cellClassName: "whitespace-nowrap text-n-700",
      cell: (quote) => quote.territory,
    },
    ...(optional.email
      ? [
          {
            id: "email",
            label: "Email",
            cellClassName: "whitespace-nowrap",
            cell: (quote: QuoteRequest) => (
              <a
                href={`mailto:${quote.email}`}
                onClick={(event) => event.stopPropagation()}
                className="text-navy-500 hover:underline"
              >
                {quote.email}
              </a>
            ),
          } as Column,
        ]
      : []),
    ...(optional.phone
      ? [
          {
            id: "phone",
            label: "Phone",
            className: "w-[140px]",
            cellClassName: "whitespace-nowrap text-n-700",
            cell: (quote: QuoteRequest) => quote.phone || "—",
          } as Column,
        ]
      : []),
    ...(optional.submitted
      ? [
          {
            id: "submitted",
            label: "Submitted",
            sortKey: "created_at" as SortKey,
            className: "w-[120px]",
            cellClassName: "whitespace-nowrap text-n-700",
            cell: (quote: QuoteRequest) => new Date(quote.created_at).toLocaleDateString(),
          } as Column,
        ]
      : []),
    {
      id: "items",
      label: "Items",
      align: "right",
      className: "w-[70px]",
      cellClassName: "text-n-700",
      cell: (quote) => (itemsByQuote.get(quote.id) ?? []).length,
    },
    {
      id: "status",
      label: "Status",
      sortKey: "status",
      align: "right",
      className: "w-[160px]",
      cell: (quote) => (
        <div className="flex justify-end">
          <StatusChip quote={quote} />
        </div>
      ),
    },
  ];

  const toolbar = (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <Input
        className="sm:max-w-xs"
        value={search}
        placeholder="Search customer, company, email, SKU…"
        onChange={(event) => go({ q: event.target.value, page: 1 })}
      />
      <Select value={filter} onValueChange={(value) => go({ status: value, page: 1 })}>
        <SelectTrigger className="w-[210px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses ({(quotes.data ?? []).length})</SelectItem>
          {QUOTE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabel(status)} ({statusCounts[status] ?? 0})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-n-500">{sorted.length} results</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="ml-auto gap-2">
            <Columns3 className="size-4" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-n-500">
            Optional columns
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {OPTIONAL_COLUMNS.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={optional[column.id]}
              onCheckedChange={() => toggleOptional(column.id)}
              onSelect={(event) => event.preventDefault()}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const footer = (
    <p className="mt-3 text-xs text-n-500">
      {sorted.length} request{sorted.length === 1 ? "" : "s"}
      {QUOTE_STATUSES.filter((status) => (filteredCounts[status] ?? 0) > 0).map(
        (status) => ` · ${filteredCounts[status]} ${statusLabel(status)}`,
      )}
    </p>
  );

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-n-900">Quote requests</h1>
        <p className="mt-1 text-sm text-n-500">
          One row per request — click a row for the full detail.
        </p>
      </div>

      {toolbar}

      {quotes.isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="mt-10 text-n-500">No requests match this filter.</p>
      ) : isDesktop ? (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-n-200 bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-n-200">
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-n-500 ${column.align === "right" ? "text-right" : "text-left"} ${column.className ?? ""}`}
                    >
                      {column.sortKey ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-n-900"
                          onClick={() => toggleSort(column.sortKey as SortKey)}
                        >
                          {column.label}
                          {sort === column.sortKey ? (
                            dir === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            )
                          ) : null}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((quote) => (
                    <tr
                      key={quote.id}
                      onClick={() => setSelected(quote.id)}
                      className="cursor-pointer border-b border-n-200 last:border-0 hover:bg-navy-50"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={`px-3 py-2 ${column.align === "right" ? "text-right" : ""} ${column.cellClassName ?? ""}`}
                          {...(column.id === "age"
                            ? { title: new Date(quote.created_at).toLocaleString() }
                            : {})}
                        >
                          {column.cell(quote)}
                        </td>
                      ))}
                    </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            {footer}
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={current <= 1}
                  onClick={() => go({ page: current - 1 })}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs text-n-500">
                  Page {current} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={current >= totalPages}
                  onClick={() => go({ page: current + 1 })}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-4">
          {pageRows.map((quote) => {
            const quoteItems = (items.data ?? []).filter(
              (item) => item.quote_request_id === quote.id,
            );
            const isOpen = open === quote.id;
            return (
              <div key={quote.id} className="rounded-2xl border border-n-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-n-900">{quote.company}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[quote.status] ?? "bg-n-500 text-white"}`}
                      >
                        {quote.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-n-500">
                      {quote.customer_name} · {quote.territory}
                    </p>
                    <p className="mt-1 text-sm">
                      <a href={`mailto:${quote.email}`} className="text-navy-500 hover:text-navy-700 hover:underline">
                        {quote.email}
                      </a>
                      {quote.phone ? ` · ${quote.phone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-n-500">
                      {new Date(quote.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Select
                    value={quote.status}
                    onValueChange={(status) => updateStatus.mutate({ id: quote.id, status })}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUOTE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : quote.id)}
                  className="mt-4 text-sm font-semibold text-primary"
                >
                  {isOpen ? "Hide" : "View"} {quoteItems.length} item
                  {quoteItems.length === 1 ? "" : "s"}
                </button>

                {isOpen ? (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    {quote.message ? (
                      <p className="text-sm text-muted-foreground">“{quote.message}”</p>
                    ) : null}
                    <ul className="space-y-2 text-sm">
                      {quoteItems.map((item) => (
                        <li key={item.id} className="flex justify-between gap-4">
                          <span>
                            {item.product_name}
                            {item.shipping_methods === "air_only" ||
                            item.shipping_methods === "sea_only" ? (
                              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                {item.shipping_methods === "air_only" ? "Air only" : "Sea only"}
                              </span>
                            ) : null}
                            {item.notes ? (
                              <span className="text-muted-foreground"> — {item.notes}</span>
                            ) : null}
                          </span>
                          <span className="font-medium">×{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    {quote.artwork_url ? (
                      <p className="text-sm text-muted-foreground">
                        Artwork file: {quote.artwork_url}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <QuoteDetailDrawer
        quote={selectedQuote}
        items={itemsByQuote.get(selected ?? "") ?? []}
        productsById={productsById}
        statusControl={selectedQuote ? <StatusChip quote={selectedQuote} /> : null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
