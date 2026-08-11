import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

const quoteSchema = z.object({
  customer_name: trimmed(120),
  company: trimmed(160),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  territory: trimmed(120),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  artwork_url: z.string().trim().max(500).regex(/^[\w./-]+$/).nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid().nullable().optional(),
        product_name: trimmed(200),
        quantity: z.number().int().min(1).max(1_000_000),
        notes: z.string().trim().max(1000).nullable().optional(),
      }),
    )
    .min(1)
    .max(100),
});

export type QuoteSubmission = z.input<typeof quoteSchema>;

export const submitQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => quoteSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { items, ...request } = data;

    const { data: inserted, error } = await supabaseAdmin
      .from("quote_requests")
      .insert({
        customer_name: request.customer_name,
        company: request.company,
        email: request.email,
        phone: request.phone ? request.phone : null,
        territory: request.territory,
        message: request.message ? request.message : null,
        artwork_url: request.artwork_url ?? null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("[quote] failed to create quote request", error);
      throw new Error("Unable to submit quote request");
    }

    const { error: itemsError } = await supabaseAdmin.from("quote_request_items").insert(
      items.map((item) => ({
        quote_request_id: inserted.id,
        product_id: item.product_id ?? null,
        product_name: item.product_name,
        quantity: item.quantity,
        notes: item.notes ? item.notes : null,
      })),
    );

    if (itemsError) {
      console.error("[quote] failed to create quote items", itemsError);
      throw new Error("Unable to submit quote request");
    }

    return { ok: true as const };
  });
