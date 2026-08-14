/**
 * Derived image files (performance only — no access-rule changes).
 *
 * Each original object in the private `product-images` bucket gets two
 * derivatives stored alongside it:
 *   {name}__card.webp   max 480px long edge  (card + carousel slots)
 *   {name}__thumb.webp  max 96px long edge   (admin thumbs / small strips)
 * The lightbox always keeps the original. Every consumer falls back to the
 * original when a variant is missing, so tiles can never break.
 */
export type ImageVariant = "original" | "card" | "thumb";

export const VARIANT_SPECS = {
  card: { suffix: "__card.webp", maxEdge: 480, quality: 0.75 },
  thumb: { suffix: "__thumb.webp", maxEdge: 96, quality: 0.75 },
} as const;

export const VARIANT_KEYS = ["card", "thumb"] as const;

/** True for objects that are themselves derivatives. */
export function isVariantPath(path: string) {
  return VARIANT_KEYS.some((key) => path.endsWith(VARIANT_SPECS[key].suffix));
}

/** "a/b-photo.jpg" + card -> "a/b-photo__card.webp" */
export function variantPath(path: string, variant: Exclude<ImageVariant, "original">) {
  const base = path.replace(/\.[^./]+$/, "");
  return `${base}${VARIANT_SPECS[variant].suffix}`;
}

/**
 * Swaps a failed variant back to the original exactly once. Used as the
 * onError handler on every <img> pointed at a derivative.
 */
export function fallbackToOriginal(
  event: React.SyntheticEvent<HTMLImageElement>,
  originalSrc: string,
) {
  const img = event.currentTarget;
  if (img.dataset["fellBack"] === "1" || img.src.endsWith(originalSrc)) return;
  img.dataset["fellBack"] = "1";
  img.src = originalSrc;
}

/** Browser-side resize (the server runtime has no image toolchain). */
export async function makeVariantBlob(
  source: Blob,
  variant: Exclude<ImageVariant, "original">,
): Promise<Blob> {
  const spec = VARIANT_SPECS[variant];
  const bitmap = await createImageBitmap(source);
  const longEdge = Math.max(bitmap.width, bitmap.height) || 1;
  const scale = Math.min(1, spec.maxEdge / longEdge);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", spec.quality),
  );
  if (!blob) throw new Error("Could not encode WebP");
  return blob;
}
