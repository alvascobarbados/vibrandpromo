import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ARTWORK_MAX_BYTES, isAllowedArtwork, safeArtworkName } from "@/lib/artwork";

/**
 * Anonymous uploads to the private quote-artwork bucket are blocked by storage
 * RLS. The server validates type/size, generates an unguessable path and returns
 * a one-object signed upload token.
 */
export const createArtworkUpload = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        filename: z.string().trim().min(1).max(200),
        size: z.number().int().min(1).max(ARTWORK_MAX_BYTES),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (!isAllowedArtwork(data.filename)) throw new Error("Unsupported artwork file type.");

    const path = `incoming/${crypto.randomUUID()}/${safeArtworkName(data.filename)}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Same per-IP window used for quote submissions: at most 10 tokens per hour.
    const { requestIpHash, countRecent, logAttempt } = await import("@/lib/rate-limit.server");
    const ipHash = await requestIpHash();
    const { count, error: countError } = await countRecent(
      supabaseAdmin,
      "artwork_token_log",
      ipHash,
    );
    if (!countError && count >= 10) {
      throw new Error(
        "Too many artwork uploads from this connection in the last hour. Please try again later or email sales@vibrand.com.",
      );
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from("quote-artwork")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error("Could not prepare artwork upload.");

    await logAttempt(supabaseAdmin, "artwork_token_log", ipHash);

    return { path: signed.path, token: signed.token };
  });
