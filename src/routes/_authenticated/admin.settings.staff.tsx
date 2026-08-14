import { createFileRoute, redirect } from "@tanstack/react-router";

import { StaffPage } from "@/components/admin/settings/StaffPage";

export const Route = createFileRoute("/_authenticated/admin/settings/staff")({
  beforeLoad: ({ context }) => {
    if (!context.access.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Staff | Vibrand Admin" },
      { name: "description", content: "Manage staff accounts, roles and page access." },
      { property: "og:title", content: "Staff | Vibrand Admin" },
      { property: "og:description", content: "Manage Vibrand staff accounts." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});
