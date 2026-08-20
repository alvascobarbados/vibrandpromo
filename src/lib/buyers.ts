/**
 * Buyers — the named people we quote inside a client company ("Attention" on a
 * proposal). Staff-only: every read/write goes through the browser client, so
 * the staff-only RLS policies on public.buyers are the security boundary.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type BuyerRow = {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

const BUYER_COLUMNS = "id, client_id, name, email, phone, created_at, updated_at";

/** Every buyer, grouped by client in the page — one round trip for the register. */
export const buyersQuery = queryOptions({
  queryKey: ["buyers"],
  queryFn: async (): Promise<BuyerRow[]> => {
    const { data, error } = await supabase
      .from("buyers")
      .select(BUYER_COLUMNS)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as BuyerRow[];
  },
});

export function buyersByClient(rows: BuyerRow[]): Map<string, BuyerRow[]> {
  const map = new Map<string, BuyerRow[]>();
  for (const row of rows) {
    const list = map.get(row.client_id);
    if (list) list.push(row);
    else map.set(row.client_id, [row]);
  }
  return map;
}

export async function createBuyer(clientId: string, name: string): Promise<BuyerRow> {
  const { data, error } = await supabase
    .from("buyers")
    .insert({ client_id: clientId, name })
    .select(BUYER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as BuyerRow;
}

export async function updateBuyer(id: string, patch: Partial<BuyerRow>) {
  const { error } = await supabase.from("buyers").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBuyer(id: string) {
  const { error } = await supabase.from("buyers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
