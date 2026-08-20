import { createFileRoute, Link, stripSearchParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DesktopCatalog } from "@/components/site/DesktopCatalog";
import { SiteLayout } from "@/components/site/SiteLayout";
import { addProposalItem, removeProposalItem } from "@/lib/proposal-mutations";
import { proposalItemsQuery, proposalQuery } from "@/lib/proposals";
import { parseCatalogSearch, type CatalogSearch } from "@/lib/catalog-filters";

export const Route = createFileRoute("/sales/proposals/$id/add")({
  validateSearch: (search: Record<string, unknown>): Partial<CatalogSearch> & { page?: number } => ({
    ...parseCatalogSearch(search),
    page: Number(search["page"]) > 0 ? Number(search["page"]) : 1,
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
        ready: [],
        sup: [],
      }),
    ],
  },
  head: () => ({
    meta: [
      { title: "Add Items to Proposal | Vibrand Staff" },
      {
        name: "description",
        content: "Pick catalogue products to add to a Vibrand client proposal.",
      },
      { property: "og:title", content: "Add Items to Proposal | Vibrand Staff" },
      { property: "og:description", content: "Staff product picker for Vibrand proposals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PickerRoute,
});

function PickerRoute() {
  const { id } = Route.useParams();
  const page = Route.useSearch().page ?? 1;
  const queryClient = useQueryClient();
  const proposal = useQuery(proposalQuery(id));
  const items = useQuery(proposalItemsQuery(id));
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = items.data ?? [];
  const selectedIds = new Set(rows.map((item) => item.product_id));
  const status = proposal.data?.status ?? "draft";

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      setBusyId(productId);
      const existing = rows.find((item) => item.product_id === productId);
      if (existing) {
        await removeProposalItem(id, existing.id, status);
        return "removed" as const;
      }
      const nextPosition = rows.reduce((max, item) => Math.max(max, item.position + 1), 0);
      await addProposalItem(id, productId, status, nextPosition);
      return "added" as const;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["proposal-items", id] }),
        queryClient.invalidateQueries({ queryKey: ["proposal", id] }),
        queryClient.invalidateQueries({ queryKey: ["proposals"] }),
      ]);
      toast.success(result === "added" ? "Added to proposal" : "Removed from proposal");
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setBusyId(null),
  });

  return (
    <SiteLayout viewMode="supplier" headerSlot={<div />}>
      <div className="site-container py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-n-200 pb-4">
          <div>
            <Link
              to="/sales/proposals/$id"
              params={{ id }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:underline"
            >
              <ArrowLeft className="size-4" /> Back to proposal
            </Link>
            <h1 className="mt-2 text-xl font-bold text-navy-900">
              Add items — {proposal.data?.client_name ?? "…"} ·{" "}
              {proposal.data?.project_name ?? ""}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"} on this proposal
          </p>
        </div>
        <div className="pt-6">
          <DesktopCatalog
            page={page}
            picker={{
              selectedIds,
              onToggle: (productId) => toggle.mutate(productId),
              busyId,
            }}
          />
        </div>
      </div>
    </SiteLayout>
  );
}