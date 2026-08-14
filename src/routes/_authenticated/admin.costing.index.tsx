import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/costing/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/costing/rates", replace: true });
  },
});
