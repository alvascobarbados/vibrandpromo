import { requirePage } from "@/lib/admin-guard";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { QUOTE_STATUSES, quoteRequestItemsQuery, quoteRequestsQuery } from "@/lib/admin";

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
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

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

  const visible = (quotes.data ?? []).filter(
    (quote) => filter === "all" || quote.status === filter,
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-n-900">Quote requests</h1>
          <p className="mt-2 text-n-500">{visible.length} shown</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {QUOTE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {quotes.isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-n-500">No requests match this filter.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {visible.map((quote) => {
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
                          {status.replace("_", " ")}
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
    </div>
  );
}
