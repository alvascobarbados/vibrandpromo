import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Generic per-user preference storage in public.user_prefs (prefs.<section>.<key>).
 * Shared by the products table column widths and the quotes table column picker.
 * No localStorage/sessionStorage — the database is the only store.
 */
type Prefs = Record<string, any>;

export async function loadPrefValue<T>(section: string, key: string): Promise<T | undefined> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return undefined;
  const { data } = await supabase
    .from("user_prefs")
    .select("prefs")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return (data?.prefs as Prefs | null)?.[section]?.[key] as T | undefined;
}

export async function savePrefValue(section: string, key: string, value: unknown) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data } = await supabase
    .from("user_prefs")
    .select("prefs")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const existing = (data?.prefs as Prefs | null) ?? {};
  const { error } = await supabase.from("user_prefs").upsert({
    user_id: auth.user.id,
    prefs: { ...existing, [section]: { ...(existing[section] ?? {}), [key]: value } },
  });
  if (error) console.error(`Could not save ${section}.${key}`, error.message);
}

/** Debounced writer (~500ms), matching the products table behaviour. */
export function useDebouncedPrefWriter(section: string, key: string, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return useCallback(
    (value: unknown) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void savePrefValue(section, key, value), delay);
    },
    [section, key, delay],
  );
}

/**
 * Loads a preference value once, falling back to defaults.
 * legacyKey: one-time import of an older localStorage value, which is then deleted.
 */
export function usePrefValue<T>(
  section: string,
  key: string,
  defaults: T,
  sanitize: (raw: unknown) => T | undefined,
  legacyKey?: string,
) {
  const [value, setValue] = useState<T>(defaults);
  const write = useDebouncedPrefWriter(section, key);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = sanitize(await loadPrefValue(section, key));
      if (cancelled) return;
      if (stored !== undefined) {
        setValue(stored);
        return;
      }
      if (legacyKey && typeof window !== "undefined") {
        let legacy: T | undefined;
        try {
          const raw = window.localStorage.getItem(legacyKey);
          if (raw) legacy = sanitize(JSON.parse(raw));
        } catch {
          /* unreadable legacy preference */
        }
        // One-time migration into the database, then the old key is removed for good.
        try {
          window.localStorage.removeItem(legacyKey);
        } catch {
          /* ignore */
        }
        if (legacy !== undefined && !cancelled) {
          setValue(legacy);
          await savePrefValue(section, key, legacy);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      write(next);
    },
    [write],
  );

  return [value, update] as const;
}
