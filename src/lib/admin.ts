import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type QuoteRequest = {
  id: string;
  customer_name: string;
  company: string;
  email: string;
  phone: string | null;
  territory: string;
  message: string | null;
  artwork_url: string | null;
  status: string;
  created_at: string;
};

export type QuoteRequestItem = {
  id: string;
  quote_request_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  notes: string | null;
};

export const QUOTE_STATUSES = ["new", "in_progress", "quoted", "closed"] as const;

export const quoteRequestsQuery = queryOptions({
  queryKey: ["admin", "quote_requests"],
  queryFn: async (): Promise<QuoteRequest[]> => {
    const { data, error } = await supabase
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as QuoteRequest[];
  },
});

export const quoteRequestItemsQuery = queryOptions({
  queryKey: ["admin", "quote_request_items"],
  queryFn: async (): Promise<QuoteRequestItem[]> => {
    const { data, error } = await supabase.from("quote_request_items").select("*");
    if (error) throw error;
    return (data ?? []) as QuoteRequestItem[];
  },
});