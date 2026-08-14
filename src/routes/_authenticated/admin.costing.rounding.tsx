import { createFileRoute } from "@tanstack/react-router";

import { RoundingPanel } from "@/components/admin/costing/RoundingPanel";

export const Route = createFileRoute("/_authenticated/admin/costing/rounding")({
  head: () => ({
    meta: [
      { title: "Rounding Rules | Vibrand Admin" },
      { name: "description", content: "Manage price rounding bands." },
      { property: "og:title", content: "Rounding Rules | Vibrand Admin" },
      { property: "og:description", content: "Manage price rounding bands." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoundingPanel,
});
