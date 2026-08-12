import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Internal notes are written through the authenticated user's client, so the
 * existing "Staff update quote requests" policy (page lock aware) is the
 * security boundary. We stamp the editor so the drawer can show attribution.
 */
export const saveInternalNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), internal_notes: z.string().max(8000) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", userId)
      .maybeSingle();

    const name = profile?.display_name || profile?.email || "Staff";
    const stamp = new Date().toISOString();

    const { error } = await supabase
      .from("quote_requests")
      .update({
        internal_notes: data.internal_notes,
        internal_notes_updated_by: userId,
        internal_notes_updated_by_name: name,
        internal_notes_updated_at: stamp,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true as const, by: name, at: stamp };
  });

/** Short-lived signed URL for staff-only artwork downloads. */
export const getArtworkUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ path: z.string().min(1).max(500).regex(/^[\w./-]+$/) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (!isStaff) throw new Error("Forbidden: staff access required");

    const { data: signed, error } = await context.supabase.storage
      .from("quote-artwork")
      .createSignedUrl(data.path, 300);
    if (error || !signed?.signedUrl) throw new Error(error?.message ?? "Artwork not found");

    return { url: signed.signedUrl };
  });