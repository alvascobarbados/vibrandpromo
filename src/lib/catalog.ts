import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
};

export type Subcategory = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  description: string | null;
  details: string | null;
  price: number | null;
  show_price: boolean;
  is_active: boolean;
  is_featured: boolean;
  images: string[];
  moq: number;
  production_days: number;
  colour_option: string;
  decoration_methods: string[];
  inventory_source: string;
  material: string | null;
  created_at: string;
  updated_at: string;
};

export const DECORATION_METHODS = [
  "3D Printing",
  "Debossed Logo",
  "Digital Printing",
  "Embroidery",
  "Gold Stamping",
  "Heat Transfer",
  "Laser Engraving",
  "Screen Printing",
  "Sublimation (Full Colour)",
  "UV Printing",
] as const;

export const COLOUR_OPTIONS = ["Fully Customised", "Stock Colours"] as const;
export const INVENTORY_SOURCES = ["USA Inventory", "Factory Direct"] as const;

export const MOQ_BUCKETS = [
  { id: "1-24", label: "1–24", min: 1, max: 24 },
  { id: "25-49", label: "25–49", min: 25, max: 49 },
  { id: "50-99", label: "50–99", min: 50, max: 99 },
  { id: "100+", label: "100+", min: 100, max: Number.POSITIVE_INFINITY },
] as const;

export const PRODUCTION_BUCKETS = [
  { id: "1-7", label: "1–7 days", min: 1, max: 7 },
  { id: "8-14", label: "8–14 days", min: 8, max: 14 },
  { id: "15+", label: "15+ days", min: 15, max: Number.POSITIVE_INFINITY },
] as const;

export function matchesBuckets(
  value: number,
  ids: string[],
  buckets: ReadonlyArray<{ id: string; min: number; max: number }>,
) {
  if (ids.length === 0) return true;
  return ids.some((id) => {
    const bucket = buckets.find((b) => b.id === id);
    return bucket ? value >= bucket.min && value <= bucket.max : false;
  });
}

export const PRODUCT_FALLBACK_IMAGE = "https://picsum.photos/seed/vibrand-product/900/900";

export function productImage(product: Pick<Product, "images">) {
  return product.images?.[0] ?? PRODUCT_FALLBACK_IMAGE;
}

export function formatPrice(price: number | null) {
  if (price == null) return null;
  return `From $${Number(price).toFixed(2)}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, image_url, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Category[];
  },
});

export const publicProductsQuery = queryOptions({
  queryKey: ["products", "public"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Product[];
  },
});

export const allProductsQuery = queryOptions({
  queryKey: ["products", "all"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Product[];
  },
});

export function productBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data as Product) ?? null;
    },
  });
}