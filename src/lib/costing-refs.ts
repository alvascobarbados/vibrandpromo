/**
 * Decoration reference images live in the PRIVATE `costing-refs` bucket:
 * staff-only read/write policies, zero anonymous access. Nothing here is ever
 * rendered on a customer-facing page — previews are short-lived signed URLs
 * minted for the signed-in staff session.
 */
import { supabase } from "@/integrations/supabase/client";

export const COSTING_REFS_BUCKET = "costing-refs";
const SIGNED_URL_SECONDS = 300;

export function refFileProblem(file: File) {
  if (!/^image\//.test(file.type)) return "Choose an image file.";
  if (file.size > 10 * 1024 * 1024) return "Images must be 10 MB or smaller.";
  return null;
}

export async function uploadDecorationRef(decorationId: string, file: File) {
  const problem = refFileProblem(file);
  if (problem) throw new Error(problem);
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${decorationId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(COSTING_REFS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeDecorationRef(path: string) {
  const { error } = await supabase.storage.from(COSTING_REFS_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

/** Short-lived signed URL; the bucket itself is never publicly readable. */
export async function signedRefUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(COSTING_REFS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
