/**
 * Everything the staff Calculations page needs, assembled from the existing
 * staff-gated queries. No new endpoints, no new tables — the adapter turns
 * these rows into engine inputs.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { Product } from "@/lib/catalog";
import type { ProductDecoration } from "@/lib/decorations";
import type { SourcingRow, Supplier } from "@/lib/sourcing";
import { allProductsQuery, subcategoriesQuery, categoriesQuery } from "@/lib/catalog";
import { productDecorationsQuery } from "@/lib/decorations";
import { originsQuery, sourcingRowsQuery, suppliersQuery } from "@/lib/sourcing";
import {
  appSettingsQuery,
  categoryDutyQuery,
  destinationsQuery,
  originsListQuery,
  shippingMethodsQuery,
  shippingRoutesQuery,
  shippingTiersQuery,
} from "@/lib/costing";
import { calcProductInput, calcRoutes, calcSettings, dutyDecimal } from "@/lib/costing-adapter";

export type CalcProduct = {
  product: Product;
  sourcing: SourcingRow | null;
  supplier: Supplier | null;
  originCode: string | null;
  subcategoryName: string | null;
  decorations: ProductDecoration[];
  input: ReturnType<typeof calcProductInput>;
};

export function useCalcPageData() {
  const products = useQuery(allProductsQuery);
  const sourcing = useQuery(sourcingRowsQuery);
  const suppliers = useQuery(suppliersQuery);
  const origins = useQuery(originsQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const categories = useQuery(categoriesQuery);
  const decorations = useQuery(productDecorationsQuery);
  const duty = useQuery(categoryDutyQuery);
  const settingsRows = useQuery(appSettingsQuery);
  const methods = useQuery(shippingMethodsQuery);
  const routeRows = useQuery(shippingRoutesQuery);
  const tiers = useQuery(shippingTiersQuery);
  const destinations = useQuery(destinationsQuery);
  const routeOrigins = useQuery(originsListQuery);

  const settings = useMemo(() => calcSettings(settingsRows.data), [settingsRows.data]);

  const routes = useMemo(() => {
    if (!methods.data || !routeRows.data || !tiers.data || !destinations.data || !routeOrigins.data)
      return [];
    return calcRoutes({
      methods: methods.data,
      routes: routeRows.data,
      tiers: tiers.data,
      origins: routeOrigins.data,
      destinations: destinations.data,
    });
  }, [methods.data, routeRows.data, tiers.data, destinations.data, routeOrigins.data]);

  const rows = useMemo<CalcProduct[]>(() => {
    if (!products.data) return [];
    const sourcingByProduct = new Map((sourcing.data ?? []).map((row) => [row.product_id, row]));
    const supplierById = new Map((suppliers.data ?? []).map((row) => [row.id, row]));
    const originById = new Map((origins.data ?? []).map((row) => [row.id, row]));
    const subcategoryById = new Map((subcategories.data ?? []).map((row) => [row.id, row]));
    const categoryById = new Map((categories.data ?? []).map((row) => [row.id, row]));
    const decorationsByProduct = new Map<string, ProductDecoration[]>();
    for (const decoration of decorations.data ?? []) {
      const list = decorationsByProduct.get(decoration.product_id) ?? [];
      list.push(decoration);
      decorationsByProduct.set(decoration.product_id, list);
    }

    return products.data.map((product) => {
      const row = sourcingByProduct.get(product.id) ?? null;
      const supplier = row?.supplier_id ? supplierById.get(row.supplier_id) ?? null : null;
      const originCode = supplier?.origin_id
        ? originById.get(supplier.origin_id)?.code ?? null
        : null;
      const productDecorations = decorationsByProduct.get(product.id) ?? [];
      const subcategoryRate = product.subcategory_id
        ? duty.data?.subcategories[product.subcategory_id] ?? null
        : null;
      const categoryRate = product.category_id
        ? duty.data?.categories[product.category_id] ?? null
        : null;
      return {
        product,
        sourcing: row,
        supplier,
        originCode,
        subcategoryName: product.subcategory_id
          ? subcategoryById.get(product.subcategory_id)?.name ??
            (product.category_id ? categoryById.get(product.category_id)?.name ?? null : null)
          : null,
        decorations: productDecorations,
        input: calcProductInput({
          productId: product.id,
          sourcing: row,
          supplier,
          originCode,
          decorations: productDecorations,
          dutyRate: dutyDecimal(subcategoryRate, categoryRate),
        }),
      };
    });
  }, [
    products.data,
    sourcing.data,
    suppliers.data,
    origins.data,
    subcategories.data,
    categories.data,
    decorations.data,
    duty.data,
  ]);

  const error =
    products.error ?? sourcing.error ?? routeRows.error ?? settingsRows.error ?? null;

  return {
    rows,
    routes,
    settings,
    suppliers: suppliers.data ?? [],
    loading: products.isLoading || routeRows.isLoading || settingsRows.isLoading,
    error: error ? error.message : null,
  };
}