import { createFileRoute, redirect } from "@tanstack/react-router";

import { ShippingPage } from "@/components/admin/settings/ShippingPage";

export const Route = createFileRoute("/_authenticated/admin/settings/shipping")({
  beforeLoad: ({ context }) => {
    if (!context.access.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Shipping Times | Vibrand Admin" },
      { name: "description", content: "Set customer-facing air and sea lead times." },
      { property: "og:title", content: "Shipping Times | Vibrand Admin" },
      { property: "og:description", content: "Set Vibrand customer lead times." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShippingPage,
});
