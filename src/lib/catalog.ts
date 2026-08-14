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
  /** Customer visibility: 'live' is public, 'draft' is staff-only. */
  status: ProductStatus;
  is_featured: boolean;
  images: string[];
  moq: number | null;
  production_min_days: number | null;
  production_max_days: number | null;
  colour_option: string | null;
  decoration_methods: string[];
  inventory_source: string;
  material: string | null;
  size: string | null;
  capacity: string | null;
  weight: string | null;
  features: string | null;
  /** NULL means neither air nor sea is offered yet. */
  shipping_methods: string | null;
  rush_enabled: boolean;
  rush_production_min_days: number | null;
  rush_production_max_days: number | null;
  created_at: string;
  updated_at: string;
};

/** The ONE visibility field. 'draft' never reaches the customer catalogue. */
export const PRODUCT_STATUSES = ["draft", "live"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Anything that isn't exactly 'live' is treated as a draft. */
export function isLive(status: string | null | undefined) {
  return status === "live";
}

export const SHIPPING_METHODS = ["air_sea", "air_only", "sea_only"] as const;
export type ShippingMethods = (typeof SHIPPING_METHODS)[number];

export const SHIPPING_METHOD_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "air_sea", label: "Air & Sea (standard)" },
  { value: "air_only", label: "Air only" },
  { value: "sea_only", label: "Sea only" },
  { value: "none", label: "Neither (not shippable yet)" },
];

export function shippingMethodLabel(value: string | null | undefined) {
  if (value == null) return "Neither (not shippable yet)";
  return SHIPPING_METHOD_OPTIONS.find((o) => o.value === value)?.label ?? "Air & Sea (standard)";
}

/** Air freight is offered unless the product is sea-only or has no method set. */
export function airAvailable(value: string | null | undefined) {
  return value != null && value !== "sea_only";
}

/** Sea freight is offered unless the product is air-only or has no method set. */
export function seaAvailable(value: string | null | undefined) {
  return value != null && value !== "air_only";
}

/** Rush production is only possible when the item can travel by air. */
export function rushEligible(shippingMethods: string | null | undefined) {
  return airAvailable(shippingMethods);
}

/**
 * Filter labels for the public decoration list. These are the canonical
 * `decoration_methods.name` values the staff price tables project onto
 * `products.decoration_methods`, so the customer filter shows exactly one
 * label per method. Every value here now has a matching decoration method in
 * the staff master data (3D Printing / Sticker Logo / Woven Patch were added
 * as methods 3DP / STK / WVP), so there are no legacy labels left.
 */
export const DECORATION_METHODS = [
  "3D Doming",
  "Deboss",
  "Digital Printing",
  "Embroidery",
  "Foil Stamping",
  "Full Colour Dye Sublimation",
  "Heat Transfer Print",
  "Laser Engraving",
  "Screen Print",
  "UV Printing",
  "3D Printing",
  "Sticker Logo",
  "Woven Patch",
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

/** Public lead-time filter buckets, measured on the air lead time minimum. */
export const AIR_LEAD_BUCKETS = [
  { id: "0-14", label: "Up to 14 days", min: 0, max: 14 },
  { id: "15-21", label: "15–21 days", min: 15, max: 21 },
  { id: "22+", label: "22+ days", min: 22, max: Number.POSITIVE_INFINITY },
] as const;

export function matchesBuckets(
  value: number | null,
  ids: string[],
  buckets: ReadonlyArray<{ id: string; min: number; max: number }>,
) {
  if (ids.length === 0) return true;
  if (value == null) return false;
  return ids.some((id) => {
    const bucket = buckets.find((b) => b.id === id);
    return bucket ? value >= bucket.min && value <= bucket.max : false;
  });
}

/**
 * Product photos live in a private bucket (public buckets are blocked by policy),
 * so stored values are object paths served through a stable app URL. Legacy
 * absolute URLs are passed through untouched.
 */
export function imageSrc(value: string): string {
  if (/^(https?:)?\/\//.test(value) || value.startsWith("data:")) return value;
  return `/api/public/product-image/${value.split("/").map(encodeURIComponent).join("/")}`;
}

export function imageSrcList(images: string[] | null | undefined): string[] {
  return (images ?? []).map(imageSrc);
}

export function productImage(product: Pick<Product, "images">): string | null {
  const first = product.images?.[0];
  return first ? imageSrc(first) : null;
}

/** Spec values are optional in the catalogue — blank means "On request". */
export function specValue(value: number | null, suffix?: string) {
  if (value == null) return "On request";
  return suffix ? `${value} ${suffix}` : String(value);
}

/** Production time is either fixed (min only) or a min–max range. */
export function productionLabel(min: number | null, max: number | null) {
  if (min == null) return "On request";
  if (max == null || max === min) return `${min} days`;
  return `${min}–${max} days`;
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
      .eq("status", "live")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Product[];
  },
});

export const subcategoriesQuery = queryOptions({
  queryKey: ["subcategories"],
  queryFn: async (): Promise<Subcategory[]> => {
    const { data, error } = await supabase
      .from("subcategories")
      .select("id, name, slug, category_id, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Subcategory[];
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
        .eq("status", "live")
        .maybeSingle();
      if (error) throw error;
      return (data as Product) ?? null;
    },
  });
}
