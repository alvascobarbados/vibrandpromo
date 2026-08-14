import { useQuery } from "@tanstack/react-query";

import { productSourcingQuery, suppliersQuery } from "@/lib/sourcing";

/**
 * Keeps the internal sourcing data (suppliers + product_sourcing) warm on the
 * /team supplier workspace without rendering anything. The charcoal INTERNAL
 * panel was removed; the follow-up team layout will read these cached queries.
 */
export function ProductSourcingFetch() {
  useQuery(suppliersQuery);
  useQuery(productSourcingQuery);
  return null;
}