import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/settings/staff", replace: true });
  },
});
