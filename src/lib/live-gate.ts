/**
 * LIVE GATE — the ONE rule that decides whether a product may leave draft and
 * appear on the customer catalogue. Both the /team status chip and any other
 * caller use this; the messages live here only.
 */
import type { Product } from "@/lib/catalog";

export function liveGateMissing(product: Pick<Product, "name" | "images">): string[] {
  const missing: string[] = [];
  if (!product.name.trim()) missing.push("a product name");
  if ((product.images ?? []).length === 0) missing.push("at least one catalogue image");
  return missing;
}

/** Friendly problem message when the product cannot go live yet, else null. */
export function liveGateProblem(product: Pick<Product, "name" | "images">): string | null {
  const missing = liveGateMissing(product);
  if (missing.length === 0) return null;
  return `Add ${missing.join(" and ")} before going live.`;
}
