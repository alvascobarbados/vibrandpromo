import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import {
  EMPTY_SEARCH,
  activeFilterCount,
  parseCatalogSearch,
  type CatalogSearch,
  type FilterGroupId,
} from "@/lib/catalog-filters";

export type SourceScope = "all" | "Factory Direct" | "USA Inventory";

export const SOURCE_SEGMENTS: { value: SourceScope; label: string; dot?: string }[] = [
  { value: "all", label: "All" },
  { value: "Factory Direct", label: "Factory", dot: "bg-red-500" },
  { value: "USA Inventory", label: "USA", dot: "bg-blue-600" },
];

const SCOPE_KEY = "vibrand.catalog.scope";

/**
 * Filter + source-scope state lives entirely in the URL so it is shareable,
 * refresh-safe and back-button friendly. The source scope additionally persists
 * for the session so it carries across pages.
 */
export function useCatalogFilters() {
  const navigate = useNavigate();
  const raw = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const search = useMemo(() => parseCatalogSearch(raw), [raw]);
  const restored = useRef(false);

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

  const scope: SourceScope = (search.src[0] as SourceScope) ?? "all";

  function setScope(next: SourceScope) {
    try {
      if (next === "all") sessionStorage.removeItem(SCOPE_KEY);
      else sessionStorage.setItem(SCOPE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    go({ src: next === "all" ? [] : [next] });
  }

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (search.src.length > 0) return;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(SCOPE_KEY);
    } catch {
      stored = null;
    }
    if (stored === "Factory Direct" || stored === "USA Inventory") {
      go({ src: [stored] }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(group: FilterGroupId, value: string) {
    const current = search[group];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    if (group === "src") {
      setScope((next[next.length - 1] as SourceScope) ?? "all");
      return;
    }
    go({ [group]: next } as Partial<CatalogSearch>);
  }

  function clear() {
    try {
      sessionStorage.removeItem(SCOPE_KEY);
    } catch {
      /* storage unavailable */
    }
    go({ ...EMPTY_SEARCH, sort: search.sort, q: search.q });
  }

  return {
    search,
    scope,
    setScope,
    toggle,
    clear,
    update: go,
    activeCount: activeFilterCount(search),
  };
}
