export const ADMIN_PAGES = [
  { key: "products", label: "Products", to: "/admin/products" },
  { key: "categories", label: "Categories", to: "/admin/categories" },
  { key: "bulk_images", label: "Bulk Images", to: "/admin/bulk-images" },
  { key: "import", label: "Import", to: "/admin/import" },
  { key: "quotes", label: "Quote Requests", to: "/admin/quotes" },
] as const;

export type AdminPageKey = (typeof ADMIN_PAGES)[number]["key"];

export const ADMIN_PAGE_KEYS = ADMIN_PAGES.map((page) => page.key) as AdminPageKey[];

export function pageLabel(key: AdminPageKey) {
  return ADMIN_PAGES.find((page) => page.key === key)?.label ?? key;
}

export function canUsePage(access: { isAdmin: boolean; lockedPages: string[] }, key: AdminPageKey) {
  if (access.isAdmin) return true;
  return !access.lockedPages.includes(key);
}
