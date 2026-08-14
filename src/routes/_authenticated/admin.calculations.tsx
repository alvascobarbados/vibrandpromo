import { createFileRoute } from "@tanstack/react-router";

import { CalculationsPage } from "@/components/admin/calculations/CalculationsPage";
import { requirePage } from "@/lib/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/calculations")({
  beforeLoad: ({ context }) => requirePage(context.access, "products"),
  head: () => ({
    meta: [
      { title: "Calculations | Vibrand Admin" },
      { name: "description", content: "Landed-cost engine workings for staff." },
      { property: "og:title", content: "Calculations | Vibrand Admin" },
      { property: "og:description", content: "Landed-cost engine workings for staff." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalculationsPage,
});