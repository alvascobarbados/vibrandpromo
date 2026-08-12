import { useEffect, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import {
  EMPTY_SEARCH,
  activeFilterCount,
  parseCatalogSearch,
  type CatalogSearch,
  type FilterGroupId,
} from "@/lib/catalog-filters";
import {
  purgeLegacyFilterStorage,
  unknownSearchKeys,
  KNOWN_SEARCH_PARAMS,
} from "@/lib/filter-hygiene";

/**
 * Filter state lives entirely in the URL so it is shareable, refresh-safe and
 * back-button friendly.
 */
export function useCatalogFilters() {
  const navigate = useNavigate();
  const raw = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const search = useMemo(() => parseCatalogSearch(raw), [raw]);

  /** Legacy scope/source keys can never influence browsing again. */
  useEffect(() => purgeLegacyFilterStorage(), []);

  /** Unknown or legacy query params are stripped, never silently applied. */
  useEffect(() => {
    const unknown = unknownSearchKeys(raw);
    if (unknown.length === 0) return;
    const cleaned = Object.fromEntries(
      Object.entries(raw).filter(([key]) => KNOWN_SEARCH_PARAMS.has(key)),
    );
    void navigate({ search: cleaned as never, replace: true, resetScroll: false } as never);
  }, [raw, navigate]);

  const go = (
    patch: Partial<CatalogSearch & { page: number }>,
    opts?: { replace?: boolean },
  ) => {
    void navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, page: 1, ...patch }),
      replace: opts?.replace ?? false,
      resetScroll: false,
    } as never);
  };

  function toggle(group: FilterGroupId, value: string) {
    const current = search[group];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    go({ [group]: next } as Partial<CatalogSearch>);
  }

  function clear() {
    go({ ...EMPTY_SEARCH, sort: search.sort, q: search.q });
  }

  return {
    search,
    toggle,
    clear,
    update: go,
    activeCount: activeFilterCount(search),
  };
}
