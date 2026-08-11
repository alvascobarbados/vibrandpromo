import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rowSchema = z.object({
  source: z.enum(["Factory Direct", "USA Inventory"]),
  air_min_days: z.number().int().min(0).max(365),
  air_max_days: z.number().int().min(0).max(365),
  sea_min_weeks: z.number().int().min(0).max(104),
  sea_max_weeks: z.number().int().min(0).max(104),
});

/** Admin-only write path — clients have read access only. */
export const updateShippingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ rows: z.array(rowSchema).min(1).max(4) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Forbidden: admin access required");

    for (const row of data.rows) {
      if (row.air_max_days < row.air_min_days) {
        throw new Error(`${row.source}: the slowest air time can't be shorter than the fastest.`);
      }
      if (row.sea_max_weeks < row.sea_min_weeks) {
        throw new Error(`${row.source}: the slowest sea time can't be shorter than the fastest.`);
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("shipping_settings")
      .upsert(data.rows, { onConflict: "source" });
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });
