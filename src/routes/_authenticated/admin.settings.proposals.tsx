import { createFileRoute, redirect } from "@tanstack/react-router";

import { ProposalSettingsPage } from "@/components/admin/settings/ProposalSettingsPage";

export const Route = createFileRoute("/_authenticated/admin/settings/proposals")({
  beforeLoad: ({ context }) => {
    if (!context.access.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Proposal Settings | Vibrand Admin" },
      {
        name: "description",
        content: "Control proposal pagination, footer, validity and PDF filenames.",
      },
      { property: "og:title", content: "Proposal Settings | Vibrand Admin" },
      { property: "og:description", content: "Control how Vibrand proposals are shared." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProposalSettingsPage,
});
