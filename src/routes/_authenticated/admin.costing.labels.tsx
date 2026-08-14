import { createFileRoute } from "@tanstack/react-router";

import { LabelsPanel } from "@/components/admin/costing/LabelsPanel";

export const Route = createFileRoute("/_authenticated/admin/costing/labels")({
  head: () => ({
    meta: [
      { title: "Detail Labels | Vibrand Admin" },
      { name: "description", content: "Manage product attribute labels." },
      { property: "og:title", content: "Detail Labels | Vibrand Admin" },
      { property: "og:description", content: "Manage product attribute labels." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LabelsPanel,
});
