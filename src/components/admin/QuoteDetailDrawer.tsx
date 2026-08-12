import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { RushChip } from "@/components/site/RushChip";
import type { QuoteProductMeta, QuoteRequest, QuoteRequestItem } from "@/lib/admin";
import { getArtworkUrl, saveInternalNotes } from "@/lib/quotes.functions";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-n-500">{label}</p>
      <div className="mt-0.5 text-sm text-n-900">{children}</div>
    </div>
  );
}

export function QuoteDetailDrawer({
  quote,
  items,
  productsById,
  statusControl,
  onClose,
}: {
  quote: QuoteRequest | null;
  items: QuoteRequestItem[];
  productsById: Map<string, QuoteProductMeta>;
  statusControl: React.ReactNode;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [author, setAuthor] = useState<{ by: string; at: string } | null>(null);

  useEffect(() => {
    setNotes(quote?.internal_notes ?? "");
    setAuthor(
      quote?.internal_notes_updated_at
        ? { by: quote.internal_notes_updated_by_name || "Staff", at: quote.internal_notes_updated_at }
        : null,
    );
  }, [quote?.id, quote?.internal_notes, quote?.internal_notes_updated_at, quote?.internal_notes_updated_by_name]);

  const saveNotes = useMutation({
    mutationFn: async () => {
      if (!quote) return null;
      return await saveInternalNotes({ data: { id: quote.id, internal_notes: notes } });
    },
    onSuccess: (result) => {
      if (result) setAuthor({ by: result.by, at: result.at });
      toast.success("Notes saved");
      void queryClient.invalidateQueries({ queryKey: ["admin", "quote_requests"] });
    },
    onError: () => toast.error("Could not save the notes"),
  });

  const artwork = useMutation({
    mutationFn: async () => {
      if (!quote?.artwork_url) return null;
      return await getArtworkUrl({ data: { path: quote.artwork_url } });
    },
    onSuccess: (result) => {
      if (result?.url) window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: () => toast.error("Could not open the artwork file"),
  });

  return (
    <Sheet open={quote !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[480px]">
        {quote ? (
          <>
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="text-lg">{quote.company}</SheetTitle>
              <p className="text-sm text-n-500">{quote.customer_name}</p>
            </SheetHeader>

            <div className="mt-4">{statusControl}</div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-n-200 pt-4">
              <Field label="Territory">{quote.territory}</Field>
              <Field label="Submitted">{new Date(quote.created_at).toLocaleString()}</Field>
              <Field label="Email">
                <a href={`mailto:${quote.email}`} className="text-navy-500 hover:underline">
                  {quote.email}
                </a>
              </Field>
              <Field label="Phone">{quote.phone || "—"}</Field>
            </div>

            <div className="mt-5 border-t border-n-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-n-500">
                Items ({items.length})
              </p>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-n-500">
                    <th className="py-1 text-left font-semibold">SKU</th>
                    <th className="py-1 text-left font-semibold">Product</th>
                    <th className="py-1 text-right font-semibold">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const product = item.product_id ? productsById.get(item.product_id) : undefined;
                    return (
                      <tr key={item.id} className="border-t border-n-200 align-top">
                        <td className="py-2 pr-2 font-mono text-xs text-n-500">
                          {product?.sku ?? "—"}
                        </td>
                        <td className="py-2 pr-2">
                          <span className="font-medium text-n-900">{item.product_name}</span>
                          <span className="ml-2 inline-flex flex-wrap items-center gap-1 align-middle">
                            {item.shipping_methods === "air_only" ? (
                              <span className="rounded-full bg-n-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-n-700">
                                Air only
                              </span>
                            ) : null}
                            {item.shipping_methods === "sea_only" ? (
                              <span className="rounded-full bg-n-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-n-700">
                                Sea only
                              </span>
                            ) : null}
                            {product?.rush_enabled ? <RushChip size="static" /> : null}
                          </span>
                          {item.notes ? (
                            <p className="mt-1 text-xs text-n-500">{item.notes}</p>
                          ) : null}
                        </td>
                        <td className="py-2 text-right font-semibold">×{item.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {quote.message ? (
              <div className="mt-5 border-t border-n-200 pt-4">
                <Field label="Customer message">
                  <p className="whitespace-pre-wrap">{quote.message}</p>
                </Field>
              </div>
            ) : null}

            {quote.artwork_url ? (
              <div className="mt-5 border-t border-n-200 pt-4">
                <Field label="Artwork">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-xs">
                      {quote.artwork_url.split("/").pop()}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => artwork.mutate()}
                      disabled={artwork.isPending}
                    >
                      {artwork.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 size-4" />
                      )}
                      Preview
                    </Button>
                  </div>
                </Field>
              </div>
            ) : null}

            <div className="mt-5 border-t border-n-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-n-500">
                Internal notes
              </p>
              <Textarea
                className="mt-2 min-h-28"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Visible to staff only…"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-n-500">
                  {author
                    ? `Last edited by ${author.by} · ${new Date(author.at).toLocaleString()}`
                    : "No notes yet."}
                </p>
                <Button
                  size="sm"
                  onClick={() => saveNotes.mutate()}
                  disabled={saveNotes.isPending || notes === (quote.internal_notes ?? "")}
                >
                  {saveNotes.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Save notes
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}