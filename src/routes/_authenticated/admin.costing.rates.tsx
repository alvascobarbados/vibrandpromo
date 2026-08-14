import { createFileRoute } from "@tanstack/react-router";

import { RatesPanel } from "@/components/admin/costing/RatesPanel";

export const Route = createFileRoute("/_authenticated/admin/costing/rates")({
  head: () => ({
    meta: [
      { title: "Rates & Factors | Vibrand Admin" },
      { name: "description", content: "Edit FX rates, freight factors and pricing defaults." },
      { property: "og:title", content: "Rates & Factors | Vibrand Admin" },
      { property: "og:description", content: "Edit FX rates, freight factors and pricing defaults." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RatesPanel,
});
