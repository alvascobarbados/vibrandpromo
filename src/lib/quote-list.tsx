import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type QuoteItem = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  quantity: number;
  notes: string;
  /** Minimum order quantity captured at add time, so the quote list can enforce it. */
  moq?: number | null;
};

type QuoteListContextValue = {
  items: QuoteItem[];
  count: number;
  bump: number;
  addItem: (item: QuoteItem) => void;
  updateItem: (productId: string, patch: Partial<QuoteItem>) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "vibrand-quote-list";

const QuoteListContext = createContext<QuoteListContextValue | null>(null);

export function QuoteListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as QuoteItem[]);
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback((item: QuoteItem) => {
    setBump((n) => n + 1);
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (!existing) return [...prev, item];
      return prev.map((i) =>
        i.productId === item.productId
          ? { ...i, quantity: i.quantity + item.quantity, notes: item.notes || i.notes }
          : i,
      );
    });
  }, []);

  const updateItem = useCallback((productId: string, patch: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      bump,
      addItem,
      updateItem,
      removeItem,
      clear,
    }),
    [items, bump, addItem, updateItem, removeItem, clear],
  );

  return <QuoteListContext.Provider value={value}>{children}</QuoteListContext.Provider>;
}

export function useQuoteList() {
  const ctx = useContext(QuoteListContext);
  if (!ctx) throw new Error("useQuoteList must be used inside QuoteListProvider");
  return ctx;
}
