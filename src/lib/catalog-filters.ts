import {
  AIR_LEAD_BUCKETS,
  MOQ_BUCKETS,
  matchesBuckets,
  type Category,
  type Product,
  type Subcategory,
} from "@/lib/catalog";
import { calculatedAirMin, type ShippingMap } from "@/lib/shipping";

export type FilterGroupId = "cat" | "sub" | "moq" | "prod" | "colour" | "deco" | "src" | "mat";

export type CatalogSearch = {
  q: string;
  sort: string;
  cat: string[];
  sub: string[];
  moq: string[];
  prod: string[];
  colour: string[];
  deco: string[];
  src: string[];
  mat: string[];
  /**
   * STAFF-ONLY (/team) costing-gate filter: "ready" / "incomplete". It is not a
   * FilterGroupId and never takes part in `filterProducts`, so the customer
   * catalogue is untouched by it. The Pricelist applies it via
   * `matchesReadyFilter` from src/lib/costing-gate.ts.
   */
  ready: string[];
  /**
   * STAFF-ONLY (/team) supplier filter: supplier CODES plus the literal "none"
   * for products with no sourcing row / no supplier. Not a FilterGroupId, so it
   * never takes part in `filterProducts` and is inert on the customer shop.
   */
  sup: string[];
};

export const EMPTY_SEARCH: CatalogSearch = {
  q: "",
  sort: "default",
  cat: [],
  sub: [],
  moq: [],
  prod: [],
  colour: [],
  deco: [],
  src: [],
  mat: [],
  ready: [],
  sup: [],
};

export const SUPPLIER_LABEL = "Supplier";
export const UNASSIGNED_SUPPLIER = "none";

export const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A–Z" },
  { value: "moq", label: "MOQ (low to high)" },
] as const;

export const GROUP_LABELS: Record<FilterGroupId, string> = {
  cat: "Category",
  sub: "Subcategory",
  moq: "MOQ Range",
  prod: "Lead time (air)",
  colour: "Colour Options",
  deco: "Decoration Method",
  src: "Inventory Source",
  mat: "Material",
};

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.length > 0) return value.split(",").filter(Boolean);
  return [];
}

export function parseCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  return {
    q: typeof raw["q"] === "string" ? raw["q"] : "",
    sort: typeof raw["sort"] === "string" ? raw["sort"] : "default",
    cat: toArray(raw["cat"]),
    sub: toArray(raw["sub"]),
    moq: toArray(raw["moq"]),
    prod: toArray(raw["prod"]),
    colour: toArray(raw["colour"]),
    deco: toArray(raw["deco"]),
    src: toArray(raw["src"]),
    mat: toArray(raw["mat"]),
    ready: toArray(raw["ready"]).filter(
      (value) => value === "ready" || value === "incomplete",
    ),
    sup: toArray(raw["sup"]),
  };
}

export const READY_LABEL = "Costing status";

function matchesSearchTerm(product: Product, q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    product.name.toLowerCase().includes(term) || (product.sku ?? "").toLowerCase().includes(term)
  );
}

export type Taxonomy = {
  categories: Category[];
  subcategories: Subcategory[];
  shipping: ShippingMap;
};

export function groupMatchers({ categories, subcategories, shipping }: Taxonomy) {
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const subById = new Map(subcategories.map((s) => [s.id, s] as const));

  const matchers: Record<FilterGroupId, (product: Product, values: string[]) => boolean> = {
    cat: (product, values) =>
      values.length === 0 ||
      values.includes(categoryById.get(product.category_id ?? "")?.slug ?? ""),
    sub: (product, values) =>
      values.length === 0 || values.includes(subById.get(product.subcategory_id ?? "")?.slug ?? ""),
    moq: (product, values) => matchesBuckets(product.moq, values, MOQ_BUCKETS),
    prod: (product, values) =>
      matchesBuckets(calculatedAirMin(product, shipping), values, AIR_LEAD_BUCKETS),
    colour: (product, values) =>
      values.length === 0 || values.includes(product.colour_option ?? ""),
    deco: (product, values) =>
      values.length === 0 ||
      values.some((value) => (product.decoration_methods ?? []).includes(value)),
    src: (product, values) => values.length === 0 || values.includes(product.inventory_source),
    mat: (product, values) => values.length === 0 || values.includes(product.material ?? ""),
  };

  return matchers;
}

const GROUP_IDS: FilterGroupId[] = ["cat", "sub", "moq", "prod", "colour", "deco", "src", "mat"];

export function filterProducts(
  products: Product[],
  search: CatalogSearch,
  taxonomy: Taxonomy,
  skipGroup?: FilterGroupId,
) {
  const matchers = groupMatchers(taxonomy);
  return products.filter((product) => {
    if (!matchesSearchTerm(product, search.q)) return false;
    return GROUP_IDS.every((group) =>
      group === skipGroup || (skipGroup === "cat" && group === "sub")
        ? true
        : matchers[group](product, search[group]),
    );
  });
}

export function sortProducts(products: Product[], sort: string) {
  const list = [...products];
  if (sort === "name") return list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "moq")
    return list.sort(
      (a, b) => (a.moq ?? Number.POSITIVE_INFINITY) - (b.moq ?? Number.POSITIVE_INFINITY),
    );
  if (sort === "newest")
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return list.sort((a, b) => (a.sku ?? "").localeCompare(b.sku ?? ""));
}

export function activeFilterCount(search: CatalogSearch) {
  return (
    GROUP_IDS.reduce((total, group) => total + search[group].length, 0) + search.ready.length
  );
}

export { GROUP_IDS };
