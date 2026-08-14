import { createFileRoute } from "@tanstack/react-router";

import { RoutesPanel } from "@/components/admin/costing/RoutesPanel";

export const Route = createFileRoute("/_authenticated/admin/costing/routes")({
  head: () => ({
    meta: [
      { title: "Shipping Routes | Vibrand Admin" },
      { name: "description", content: "Edit shipping methods, routes and freight tier ladders." },
      { property: "og:title", content: "Shipping Routes | Vibrand Admin" },
      { property: "og:description", content: "Edit shipping methods, routes and freight tier ladders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoutesPanel,
});
