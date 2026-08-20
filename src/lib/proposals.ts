/**
 * Sales proposals — staff-only data layer.
 *
 * Every read/write here goes through the browser client, so the staff-only RLS
 * policies on clients / proposals / proposal_items are the security boundary.
 * Anonymous proposal viewing never touches this module; it goes through the
 * public getProposalByToken server fn and reads frozen snapshots only.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Incoterm, PricingCurrency } from "@/lib/pricing-types";
import type { ProposalSnapshot } from "@/lib/proposal-snapshot";

export type { ProposalSnapshot } from "@/lib/proposal-snapshot";

export const PROPOSAL_INCOTERMS: Incoterm[] = ["CIF", "FOB", "LDF", "LDP"];

export type ProposalStatus = "draft" | "generated";

export type Client = { id: string; name: string; created_at: string };

export type Proposal = {
  id: string;
  client_id: string;
  buyer_id: string | null;
  project_name: string;
  incoterm: Incoterm;
  status: ProposalStatus;
  share_token: string | null;
  generated_at: string | null;
  edited_since_generated: boolean;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type ProposalItem = {
  id: string;
  proposal_id: string;
  product_id: string;
  position: number;
  snapshot: ProposalSnapshot | null;
  created_at: string;
};

export type ProposalListRow = Proposal & { client_name: string; item_count: number };

export const clientsQuery = queryOptions({
  queryKey: ["clients"],
  queryFn: async (): Promise<Client[]> => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, created_at")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Client[];
  },
});

export const proposalsQuery = queryOptions({
  queryKey: ["proposals"],
  queryFn: async (): Promise<ProposalListRow[]> => {
    const { data, error } = await supabase
      .from("proposals")
      .select("*, clients(name), proposal_items(id)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as never[]).map((row: never) => {
      const raw = row as unknown as Proposal & {
        clients: { name: string } | null;
        proposal_items: Array<{ id: string }> | null;
      };
      const { clients, proposal_items, ...rest } = raw;
      return {
        ...(rest as Proposal),
        client_name: clients?.name ?? "—",
        item_count: proposal_items?.length ?? 0,
      };
    });
  },
});

export function proposalQuery(id: string) {
  return queryOptions({
    queryKey: ["proposal", id],
    queryFn: async (): Promise<
      (Proposal & { client_name: string; buyer_name: string | null }) | null
    > => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, clients(name), buyers(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const raw = data as unknown as Proposal & {
        clients: { name: string } | null;
        buyers: { name: string } | null;
      };
      const { clients, buyers, ...rest } = raw;
      return {
        ...(rest as Proposal),
        client_name: clients?.name ?? "—",
        buyer_name: buyers?.name ?? null,
      };
    },
  });
}

export function proposalItemsQuery(proposalId: string) {
  return queryOptions({
    queryKey: ["proposal-items", proposalId],
    queryFn: async (): Promise<ProposalItem[]> => {
      const { data, error } = await supabase
        .from("proposal_items")
        .select("id, proposal_id, product_id, position, snapshot, created_at")
        .eq("proposal_id", proposalId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProposalItem[];
    },
  });
}

/** Currency tag shared by every proposal price surface. */
export const CURRENCY_TAG: Record<PricingCurrency, string> = { USD: "US$", BBD: "BBD$" };

export const INCOTERM_SCOPE: Record<Incoterm, string> = {
  CIF: "Cost, Insurance & Freight to any Caribbean island",
  FOB: "Free On Board at the origin port — freight, insurance & duties excluded",
  LDF: "Landed & Duty-Free in Barbados — not subject to VAT",
  LDP: "Landed & Duty-Paid in Barbados — excludes VAT",
};

/** Compact "3 days ago" style stamp for the list meta line. */
export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatProposalDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}