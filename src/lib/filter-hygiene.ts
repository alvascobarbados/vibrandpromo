import { GROUP_IDS } from "@/lib/catalog-filters";

/**
 * Filter state lives ONLY in the URL. These are legacy storage keys from the
 * removed SourceScope / inventory-scope feature. Any of them left in a
 * visitor's browser could silently narrow the catalog, so they are deleted on
 * every app load.
 */
export const LEGACY_FILTER_KEYS = [
  "vibrand.catalog.scope",
  "vibrand.catalog.source",
  "vibrand.catalog.filters",
  "vibrand.filters",
  "vibrand.scope",
  "vibrand.source",
  "catalog.scope",
  "catalog.source",
  "scope",
  "source",
  "inventory",
  "inventory_source",
  "inventorySource",
];

/** Params the catalog honours. Anything else is stripped from the URL. */
export const KNOWN_SEARCH_PARAMS = new Set<string>([
  ...GROUP_IDS,
  "q",
  "sort",
  "page",
  "edit",
  /** /team costing-gate filter (staff-only, still URL state with a chip). */
  "ready",
]);

export function purgeLegacyFilterStorage() {
  if (typeof window === "undefined") return;
  for (const store of [window.sessionStorage, window.localStorage]) {
    try {
      for (const key of LEGACY_FILTER_KEYS) store.removeItem(key);
    } catch {
      /* storage may be unavailable */
    }
  }
}

/** Returns the unknown/legacy param keys present in a raw search object. */
export function unknownSearchKeys(raw: Record<string, unknown>) {
  return Object.keys(raw).filter((key) => !KNOWN_SEARCH_PARAMS.has(key));
}

/**
 * Invariant: nothing may narrow the list without a removable chip. In dev this
 * surfaces the moment a hidden filter sneaks back in.
 */
export function warnInvisibleFilter(where: string, filtered: number, total: number, chips: number) {
  if (!import.meta.env.DEV) return;
  if (chips === 0 && total > 0 && filtered < total) {
    console.warn(
      `[filters] Invisible filter on ${where}: showing ${filtered}/${total} products with zero active chips.`,
    );
  }
}
