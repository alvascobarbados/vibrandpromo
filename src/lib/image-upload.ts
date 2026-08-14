/**
 * Product photo uploads. Every upload writes the original plus both derivatives
 * so cards never have to download a full-size original. Variant failures never
 * block the upload — readers fall back to the original.
 */
import { supabase } from "@/integrations/supabase/client";
import { makeVariantBlob, variantPath, VARIANT_KEYS } from "@/lib/image-variants";

export async function generateVariantsFor(path: string, source: Blob) {
  for (const key of VARIANT_KEYS) {
    try {
      const blob = await makeVariantBlob(source, key);
      await supabase.storage.from("product-images").upload(variantPath(path, key), blob, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
    } catch (error) {
      console.error(`Variant ${key} failed for ${path}`, error);
    }
  }
}

/** Uploads the original and its card/thumb derivatives; returns the object path. */
export async function uploadWithVariants(file: File) {
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "31536000" });
  if (error) throw error;
  await generateVariantsFor(path, file);
  return path;
}
