import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

const quoteSchema = z.object({
  customer_name: trimmed(120),
  company: trimmed(160),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  territory: trimmed(120),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  artwork_url: z
    .string()
    .trim()
    .max(500)
    .regex(/^[\w./-]+$/)
    .nullable()
    .optional(),
  // Honeypot: real customers never see or fill this.
  website: z.string().max(200).optional(),
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

    const { items, website, ...request } = data;

    if (website && website.trim().length > 0) {
      // Silently accept and drop obvious bot submissions.
      return { ok: true as const };
    }

    // Basic abuse guard: at most 5 submissions per hour per visitor.
    const forwarded = getRequestHeader("x-forwarded-for") ?? "";
    const ip =
      (forwarded.split(",")[0] ?? "").trim() || getRequestHeader("cf-connecting-ip") || "unknown";
    const ipHash = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))),
    ]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabaseAdmin
      .from("quote_submission_log")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if (!countError && (count ?? 0) >= 5) {
      throw new Error(
        "You've already sent us several requests in the last hour. Please email sales@vibrand.com and we'll pick it up from there.",
      );
    }

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
      await (async () => {
        // Freight availability is read from the catalogue, never trusted from the client.
        const ids = items.map((item) => item.product_id).filter((id): id is string => !!id);
        const shippingById = new Map<string, string>();
        if (ids.length) {
          const { data: products } = await supabaseAdmin
            .from("products")
            .select("id, shipping_methods")
            .in("id", ids);
          for (const product of products ?? []) {
            shippingById.set(product.id, product.shipping_methods ?? "air_sea");
          }
        }
        return items.map((item) => ({
          quote_request_id: inserted.id,
          product_id: item.product_id ?? null,
          product_name: item.product_name,
          quantity: item.quantity,
          notes: item.notes ? item.notes : null,
          shipping_methods: item.product_id
            ? (shippingById.get(item.product_id) ?? null)
            : null,
        }));
      })(),
    );

    if (itemsError) {
      console.error("[quote] failed to create quote items", itemsError);
      throw new Error("Unable to submit quote request");
    }

    await supabaseAdmin.from("quote_submission_log").insert({ ip_hash: ipHash });

    return { ok: true as const };
  });
