import { createContext, useContext } from "react";

/**
 * Which workspace the shared catalog components are rendering inside.
 * "supplier" is the seam where internal-only UI (sourcing, cost fields, margin
 * tools) attaches — customer-facing DOM must stay byte-identical, so nothing
 * keyed off "supplier" may ever render in the customer view.
 */
export type CatalogViewMode = "customer" | "supplier";

const ViewModeContext = createContext<CatalogViewMode>("customer");

export function ViewModeProvider({
  mode,
  children,
}: {
  mode: CatalogViewMode;
  children: React.ReactNode;
}) {
  return <ViewModeContext.Provider value={mode}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  return useContext(ViewModeContext);
}