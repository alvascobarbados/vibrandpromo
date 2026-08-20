/**
 * Clients — staff-only data layer for /sales/clients and the New Proposal
 * dialog. Every read/write goes through the browser client, so the staff-only
 * RLS policies on public.clients are the security boundary. Anonymous visitors
 * never reach this module.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Incoterm } from "@/lib/pricing-types";

export type ClientRow = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  payment_terms: string;
  payment_terms_custom_days: number | null;
  country: string | null;
  incoterm: Incoterm | null;
  created_at: string;
  updated_at: string;
};

export const CLIENT_COLUMNS =
  "id, name, contact_name, phone, email, notes, payment_terms, payment_terms_custom_days, country, incoterm, created_at, updated_at";

export const PAYMENT_TERMS = [
  "Due on receipt",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "Prepaid",
  "50% deposit",
  "Custom",
] as const;

/** Fallback country options; distinct values already on file are merged in. */
export const COUNTRY_OPTIONS = [
  "Barbados",
  "Antigua and Barbuda",
  "Bahamas",
  "Cayman Islands",
  "Dominica",
  "Grenada",
  "Guyana",
  "Jamaica",
  "St. Kitts and Nevis",
  "St. Lucia",
  "St. Vincent and the Grenadines",
  "Trinidad and Tobago",
  "Turks and Caicos",
  "United Kingdom",
  "United States",
] as const;

export const clientsFullQuery = queryOptions({
  queryKey: ["clients", "full"],
  queryFn: async (): Promise<ClientRow[]> => {
    const { data, error } = await supabase
      .from("clients")
      .select(CLIENT_COLUMNS)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ClientRow[];
  },
});

/** Proposal counts per client — drives the delete guard. */
export const clientProposalCountsQuery = queryOptions({
  queryKey: ["clients", "proposal-counts"],
  queryFn: async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase.from("proposals").select("client_id");
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ client_id: string }>) {
      counts[row.client_id] = (counts[row.client_id] ?? 0) + 1;
    }
    return counts;
  },
});

export async function updateClient(id: string, patch: Partial<ClientRow>) {
  const { error } = await supabase.from("clients").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createClient(name: string): Promise<ClientRow> {
  const { data, error } = await supabase
    .from("clients")
    .insert({ name })
    .select(CLIENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as ClientRow;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** "Net 30" / "Custom — 21 days" for display. */
export function paymentTermsLabel(row: Pick<ClientRow, "payment_terms" | "payment_terms_custom_days">) {
  if (row.payment_terms === "Custom" && row.payment_terms_custom_days != null) {
    return `Custom — ${row.payment_terms_custom_days} days`;
  }
  return row.payment_terms;
}
