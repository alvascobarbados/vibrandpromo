import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/settings/shipping", replace: true });
  },
});
