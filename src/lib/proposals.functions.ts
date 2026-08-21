import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Staff-only. Freezes every item's snapshot and mints the share token once.
 */
export const generateProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ proposalId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (!isStaff) throw new Error("Forbidden: staff access required");

    const { freezeProposal } = await import("@/lib/proposals.server");
    return await freezeProposal(data.proposalId);
  });

/**
 * PUBLIC. The ONLY way an anonymous visitor reaches a proposal. Reads frozen
 * snapshots only — never the pricing engine, never a buyer's email or phone.
 * Drafts, bad tokens and empty input are all indistinguishable "not found".
 */
export const getProposalByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().trim().min(16).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { readProposalByToken } = await import("@/lib/proposals.server");
    return await readProposalByToken(data.token);
  });
