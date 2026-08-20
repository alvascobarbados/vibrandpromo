import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ productIds: z.array(z.string().uuid()).max(60) });
const staffSchema = schema.extend({ incoterm: z.enum(["CIF", "FOB", "LDF", "LDP"]) });

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

/**
 * Staff-only cost prices (FOB / LDF / LDP, and CIF for parity). Same engine,
 * same projection helper — only staff may ask for a non-CIF basis.
 */
export const getStaffPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => staffSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (!isStaff) throw new Error("Forbidden: staff access required");

    const { getPublicPricingFor } = await import("@/lib/pricing.server");
    return await getPublicPricingFor(data.productIds, data.incoterm);
  });