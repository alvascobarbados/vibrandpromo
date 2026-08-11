import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getMyAccess, type MyAccess } from "@/lib/staff.functions";
import { allProductsQuery, publicProductsQuery, type Product } from "@/lib/catalog";

type StaffSessionValue = {
  access: MyAccess | null;
  isStaff: boolean;
  isAdmin: boolean;
  hasSession: boolean;
  /** Only ever true when a verified staff session exists. */
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  barDismissed: boolean;
  dismissBar: () => void;
  signOut: () => Promise<void>;
};

const EDIT_KEY = "vibrand.site.editMode";

const StaffSessionContext = createContext<StaffSessionValue>({
  access: null,
  isStaff: false,
  isAdmin: false,
  hasSession: false,
  editMode: false,
  setEditMode: () => {},
  barDismissed: false,
  dismissBar: () => {},
  signOut: async () => {},
});

export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [editModeRaw, setEditModeRaw] = useState(false);
  const [barDismissed, setBarDismissed] = useState(false);

  useEffect(() => setReady(true), []);

  // Staff status always comes from the server-side access check, never storage.
  const accessQuery = useQuery({
    queryKey: ["my-access", "site"],
    enabled: ready,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<MyAccess | null> => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
      try {
        return await getMyAccess();
      } catch {
        return null;
      }
    },
  });

  const access = accessQuery.data ?? null;
  const isStaff = Boolean(access?.isStaff);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        setEditModeRaw(false);
        if (typeof window !== "undefined") window.sessionStorage.removeItem(EDIT_KEY);
        queryClient.setQueryData(["my-access", "site"], null);
      }
      void queryClient.invalidateQueries({ queryKey: ["my-access", "site"] });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  // Restore intent (session storage / ?edit=1) — it only takes effect once the
  // server-verified staff check passes.
  useEffect(() => {
    if (!ready || !isStaff) return;
    const stored = window.sessionStorage.getItem(EDIT_KEY) === "1";
    const fromUrl = new URLSearchParams(window.location.search).get("edit") === "1";
    if (stored || fromUrl) setEditModeRaw(true);
  }, [ready, isStaff]);

  const setEditMode = useCallback(
    (value: boolean) => {
      setEditModeRaw(value);
      if (typeof window !== "undefined") {
        if (value) window.sessionStorage.setItem(EDIT_KEY, "1");
        else window.sessionStorage.removeItem(EDIT_KEY);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    setEditMode(false);
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient, setEditMode]);

  const value = useMemo<StaffSessionValue>(
    () => ({
      access,
      isStaff,
      isAdmin: Boolean(access?.isAdmin),
      hasSession: access != null,
      editMode: isStaff && editModeRaw,
      setEditMode,
      barDismissed,
      dismissBar: () => setBarDismissed(true),
      signOut,
    }),
    [access, isStaff, editModeRaw, setEditMode, barDismissed, signOut],
  );

  return <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>;
}

export function useStaffSession() {
  return useContext(StaffSessionContext);
}

/**
 * Catalog read for public pages. Anonymous visitors keep the exact public
 * query (active products only); the staff-scoped query that also returns
 * hidden products runs only while a verified staff session has edit mode on.
 */
export function useCatalogProducts() {
  const { editMode } = useStaffSession();
  const staffView = useQuery({ ...allProductsQuery, enabled: editMode });
  const publicView = useQuery({ ...publicProductsQuery, enabled: !editMode });
  return editMode ? staffView : publicView;
}