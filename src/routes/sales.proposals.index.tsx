import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/SiteLayout";
import { ProposalsListPage } from "@/components/sales/ProposalsListPage";

export const Route = createFileRoute("/sales/proposals/")({
  head: () => ({
    meta: [
      { title: "Sales Proposals | Vibrand Staff" },
      {
        name: "description",
        content: "Build, generate and share Vibrand sales proposals for your clients.",
      },
      { property: "og:title", content: "Sales Proposals | Vibrand Staff" },
      { property: "og:description", content: "Staff workspace for Vibrand sales proposals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <SiteLayout viewMode="supplier" headerSlot={<div />}>
      <ProposalsListPage />
    </SiteLayout>
  ),
});