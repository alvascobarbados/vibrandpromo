import { createFileRoute } from "@tanstack/react-router";

import { ClientsPage } from "@/components/sales/ClientsPage";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/sales/clients")({
  head: () => ({
    meta: [
      { title: "Clients | Vibrand Staff" },
      {
        name: "description",
        content:
          "Staff register of Vibrand clients — contacts, country, incoterm defaults and payment terms.",
      },
      { property: "og:title", content: "Clients | Vibrand Staff" },
      {
        property: "og:description",
        content: "Staff register of Vibrand clients and their proposal defaults.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <SiteLayout viewMode="supplier" headerSlot={<div />}>
      <ClientsPage />
    </SiteLayout>
  ),
});
