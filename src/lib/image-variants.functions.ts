import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Staff-only listing of every object in the private product-images bucket, used
 * by the Bulk Images batch job to work out which originals still need
 * derivatives. Read-only; RLS applies as the signed-in staff user.
 */
export const listProductImageObjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const out: string[] = [];
    const limit = 1000;
    for (let offset = 0; ; offset += limit) {
      const { data, error } = await context.supabase.storage
        .from("product-images")
        .list("", { limit, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(error.message);
      const names = (data ?? []).filter((row) => row.id).map((row) => row.name);
      out.push(...names);
      if ((data ?? []).length < limit) break;
    }
    return out;
  });
