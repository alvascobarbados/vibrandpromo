import { createFileRoute } from "@tanstack/react-router";

import { DestinationsPanel } from "@/components/admin/costing/DestinationsPanel";

export const Route = createFileRoute("/_authenticated/admin/costing/destinations")({
  head: () => ({
    meta: [
      { title: "Destinations | Vibrand Admin" },
      { name: "description", content: "Manage costing destinations." },
      { property: "og:title", content: "Destinations | Vibrand Admin" },
      { property: "og:description", content: "Manage costing destinations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DestinationsPanel,
});
