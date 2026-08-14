import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({ productIds: z.array(z.string().uuid()).max(60) });

/**
 * Public, read-only. Returns nothing but productId + qty/unit CIF USD — the
 * projection happens server-side in pricing.server.ts.
 */
export const getCustomerPricing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { getPublicPricingFor } = await import("@/lib/pricing.server");
    return await getPublicPricingFor(data.productIds);
  });