import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-user, resizable column widths for the Admin › Products table.
 * Widths live in public.user_prefs (prefs.products_table.col_widths), keyed by
 * column id — never by index. No localStorage/sessionStorage anywhere.
 */
export type ColId =
  | "cat"
  | "subcat"
  | "supplier"
  | "name"
  | "sku"
  | "supitem"
  | "moq"
  | "production"
  | "status";

export const DEFAULT_COL_WIDTHS: Record<ColId, number> = {
  cat: 130,
  subcat: 130,
  supplier: 180,
  name: 260,
  sku: 110,
  supitem: 130,
  moq: 70,
  production: 100,
  status: 110,
};

/** Fixed, non-resizable columns. */
export const THUMB_WIDTH = 46;
export const CHEVRON_WIDTH = 40;

const MIN_WIDTH = 60;
const MIN_WIDTHS: Partial<Record<ColId, number>> = { name: 140 };

export const minWidthFor = (id: ColId) => MIN_WIDTHS[id] ?? MIN_WIDTH;

const PREFS_KEY = "products_table";

function sanitize(raw: unknown): Partial<Record<ColId, number>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<ColId, number>> = {};
  for (const id of Object.keys(DEFAULT_COL_WIDTHS) as ColId[]) {
    const value = (raw as Record<string, unknown>)[id];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[id] = Math.max(minWidthFor(id), Math.round(value));
    }
  }
  return out;
}

export function useColumnWidths() {
  const [widths, setWidths] = useState<Record<ColId, number>>(DEFAULT_COL_WIDTHS);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("user_prefs")
        .select("prefs")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const stored = (data?.prefs as Record<string, any> | null)?.[PREFS_KEY]?.col_widths;
      const clean = sanitize(stored);
      if (!cancelled && Object.keys(clean).length)
        setWidths({ ...DEFAULT_COL_WIDTHS, ...clean });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Debounced ~500ms write, merged into any other prefs the user has. */
  const persist = useCallback((next: Record<ColId, number>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data } = await supabase
          .from("user_prefs")
          .select("prefs")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        const existing = (data?.prefs as Record<string, any> | null) ?? {};
        await supabase.from("user_prefs").upsert({
          user_id: auth.user.id,
          prefs: {
            ...existing,
            [PREFS_KEY]: { ...(existing[PREFS_KEY] ?? {}), col_widths: next },
          },
        });
      })();
    }, 500);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const setWidth = useCallback(
    (id: ColId, value: number, commit: boolean) => {
      setWidths((prev) => {
        const next = { ...prev, [id]: Math.max(minWidthFor(id), Math.round(value)) };
        if (commit) persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetColumn = useCallback(
    (id: ColId) => {
      setWidths((prev) => {
        const next = { ...prev, [id]: DEFAULT_COL_WIDTHS[id] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetAll = useCallback(() => {
    setWidths(DEFAULT_COL_WIDTHS);
    persist(DEFAULT_COL_WIDTHS);
  }, [persist]);

  const isDefault = (Object.keys(DEFAULT_COL_WIDTHS) as ColId[]).every(
    (id) => widths[id] === DEFAULT_COL_WIDTHS[id],
  );

  const totalWidth =
    THUMB_WIDTH +
    CHEVRON_WIDTH +
    (Object.keys(DEFAULT_COL_WIDTHS) as ColId[]).reduce((sum, id) => sum + widths[id], 0);

  return { widths, setWidth, resetColumn, resetAll, isDefault, totalWidth };
}