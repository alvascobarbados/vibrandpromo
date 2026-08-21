import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalDocument, type ProposalDisplayItem } from "@/components/sales/ProposalDocument";
import { categoriesQuery, subcategoriesQuery, allProductsQuery } from "@/lib/catalog";
import { getStaffPricing } from "@/lib/pricing.functions";
import { CURRENCY_BY_INCOTERM } from "@/lib/proposal-currency";
import { buildProposalSnapshot } from "@/lib/proposal-snapshot";
import {
  removeProposalItem,
  saveProposalOrder,
} from "@/lib/proposal-mutations";
import { proposalItemsQuery, proposalQuery, formatProposalDate } from "@/lib/proposals";
import { useShippingSettings } from "@/lib/shipping";
import type { PublicPricing } from "@/lib/pricing-types";

type OrderMode = "custom" | "category";

export function ProposalEditorPage({ proposalId }: { proposalId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const proposal = useQuery(proposalQuery(proposalId));
  const items = useQuery(proposalItemsQuery(proposalId));
  const products = useQuery(allProductsQuery);
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const shipping = useShippingSettings();
  const fetchStaffPricing = useServerFn(getStaffPricing);
  const [order, setOrder] = useState<OrderMode>("custom");

  const row = proposal.data ?? null;
  const incoterm = row?.incoterm ?? "CIF";
  const isDraft = row?.status !== "generated";
  const itemRows = items.data ?? [];
  const productIds = itemRows.map((item) => item.product_id);

  /**
   * A draft prices live at the project incoterm through the existing staff
   * pricing fn — the same engine and projection the shop's staff view uses.
   */
  const pricing = useQuery({
    queryKey: ["proposal-pricing", incoterm, productIds],
    enabled: isDraft && productIds.length > 0,
    staleTime: 60_000,
    queryFn: () => fetchStaffPricing({ data: { productIds: productIds.slice(0, 60), incoterm } }),
  });

  const pricingById = useMemo(
    () => new Map<string, PublicPricing>((pricing.data ?? []).map((p) => [p.productId, p])),
    [pricing.data],
  );
  const productById = useMemo(
    () => new Map((products.data ?? []).map((product) => [product.id, product])),
    [products.data],
  );
  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );
  const subcategoryName = useMemo(
    () => new Map((subcategories.data ?? []).map((s) => [s.id, s.name])),
    [subcategories.data],
  );

  /** DRAFT renders live; a GENERATED proposal renders from its snapshot. */
  const displayItems: ProposalDisplayItem[] = useMemo(() => {
    return itemRows.flatMap((item) => {
      if (!isDraft && item.snapshot) return [{ id: item.id, snapshot: item.snapshot }];
      const product = productById.get(item.product_id);
      if (!product) return [];
      const live = pricingById.get(product.id);
      return [
        {
          id: item.id,
          snapshot: buildProposalSnapshot({
            product,
            category: product.category_id
              ? (categoryName.get(product.category_id) ?? null)
              : null,
            subcategory: product.subcategory_id
              ? (subcategoryName.get(product.subcategory_id) ?? null)
              : null,
            pricing: live ?? null,
            shipping,
            incoterm,
            currency: CURRENCY_BY_INCOTERM[incoterm],
          }),
        },
      ];
    });
  }, [
    itemRows,
    isDraft,
    productById,
    pricingById,
    categoryName,
    subcategoryName,
    shipping,
    incoterm,
  ]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["proposal-items", proposalId] }),
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] }),
      queryClient.invalidateQueries({ queryKey: ["proposals"] }),
    ]);
  };

  const reorder = useMutation({
    mutationFn: (ids: string[]) => saveProposalOrder(proposalId, ids, row?.status ?? "draft"),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (itemId: string) => removeProposalItem(proposalId, itemId, row?.status ?? "draft"),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  /** Catalogue order: category sort_order, then subcategory sort_order, then name. */
  function sortByCatalogue() {
    const catOrder = new Map((categories.data ?? []).map((c, index) => [c.id, index]));
    const subOrder = new Map((subcategories.data ?? []).map((s, index) => [s.id, index]));
    const ids = itemRows
      .slice()
      .sort((a, b) => {
        const pa = productById.get(a.product_id);
        const pb = productById.get(b.product_id);
        const ca = catOrder.get(pa?.category_id ?? "") ?? 9999;
        const cb = catOrder.get(pb?.category_id ?? "") ?? 9999;
        if (ca !== cb) return ca - cb;
        const sa = subOrder.get(pa?.subcategory_id ?? "") ?? 9999;
        const sb = subOrder.get(pb?.subcategory_id ?? "") ?? 9999;
        if (sa !== sb) return sa - sb;
        return (pa?.name ?? "").localeCompare(pb?.name ?? "");
      })
      .map((item) => item.id);
    reorder.mutate(ids);
  }

  if (proposal.isLoading) {
    return (
      <div className="site-container py-8">
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (!row) {
    return (
      <div className="site-container py-16 text-center text-sm text-muted-foreground">
        This proposal no longer exists.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-n-50">
      <div className="proposal-no-print sticky top-0 z-30 border-b border-n-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/sales/proposals" })}
            className="rounded-full px-2 py-1 text-sm font-semibold text-navy-700 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            ← Proposals
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={order}
              onValueChange={(value) => {
                setOrder(value as OrderMode);
                if (value === "category") sortByCatalogue();
              }}
            >
              <SelectTrigger className="h-10 w-56 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Order: Custom</SelectItem>
                <SelectItem value="category">Order: Category → Subcategory</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-10 rounded-full"
              onClick={() =>
                void navigate({ to: "/sales/proposals/$id/add", params: { id: proposalId } })
              }
            >
              + Add items
            </Button>
            <Button
              disabled
              title="Generation arrives with the next part"
              className="h-10 rounded-full bg-lime-500 font-semibold text-navy-900 hover:bg-lime-500"
            >
              Generate proposal →
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1120px] px-4 py-8">
        <div className="overflow-hidden rounded-[20px] border border-n-200 bg-white shadow-[0_10px_30px_-18px_rgba(20,30,50,0.25)]">
          <ProposalDocument
            header={{
              clientName: row.client_name,
              buyerName: row.buyer_name,
              projectName: row.project_name,
              status: row.status,
              incoterm,
              currency: CURRENCY_BY_INCOTERM[incoterm],
              dateISO: row.generated_at ?? row.created_at,
              preparedBy: row.created_by_name,
              itemCount: displayItems.length,
            }}
            items={displayItems}
            onRemove={(id) => remove.mutate(id)}
            onReorder={(ids) => {
              setOrder("custom");
              reorder.mutate(ids);
            }}
            onAdd={() =>
              void navigate({ to: "/sales/proposals/$id/add", params: { id: proposalId } })
            }
            footer={
              isDraft ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                  Draft — prices live at {incoterm}
                </span>
              ) : (
                <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-navy-900">
                  Generated {formatProposalDate(row.generated_at)}
                </span>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}