import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Shared artwork limits — kept server-authoritative. */
export const ARTWORK_MAX_BYTES = 20 * 1024 * 1024;
export const ARTWORK_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "pdf",
  "ai",
  "eps",
  "svg",
  "zip",
] as const;

const requestSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  size: z.number().int().min(1).max(ARTWORK_MAX_BYTES),
});

/**
 * Anonymous uploads to the private quote-artwork bucket are no longer allowed by
 * storage RLS. Instead the server validates the file type/size, generates an
 * unguessable path and hands back a short-lived signed upload token so the
 * visitor can only write that one object (never overwrite an existing file).
 */
export const createArtworkUpload = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    const extension = data.filename.split(".").pop()?.toLowerCase() ?? "";
    if (!(ARTWORK_EXTENSIONS as readonly string[]).includes(extension)) {
      throw new Error("Unsupported artwork file type.");
    }

    const safeName = data.filename.replace(/[^\w.-]+/g, "_").slice(-120);
    const path = `incoming/${crypto.randomUUID()}/${safeName}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("quote-artwork")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error("Could not prepare artwork upload.");

    return { path: signed.path, token: signed.token };
  });
