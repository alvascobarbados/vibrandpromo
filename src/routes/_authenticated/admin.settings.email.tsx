import { createFileRoute, redirect } from "@tanstack/react-router";

import { EmailSettingsPage } from "@/components/admin/settings/EmailSettingsPage";

export const Route = createFileRoute("/_authenticated/admin/settings/email")({
  beforeLoad: ({ context }) => {
    if (!context.access.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Email Settings | Vibrand Admin" },
      { name: "description", content: "Manage quote notification emails and templates." },
      { property: "og:title", content: "Email Settings | Vibrand Admin" },
      { property: "og:description", content: "Manage Vibrand quote notification emails." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailSettingsPage,
});
