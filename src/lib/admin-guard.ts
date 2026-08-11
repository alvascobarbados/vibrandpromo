import { redirect } from "@tanstack/react-router";
import { toast } from "sonner";

import { canUsePage, type AdminPageKey } from "./page-access";

/** Blocks a locked page and bounces the user back to the dashboard. */
export function requirePage(
  access: { isAdmin: boolean; lockedPages: string[] },
  page: AdminPageKey,
) {
  if (canUsePage(access, page)) return;
  toast.error("You don't have access to this page.");
  throw redirect({ to: "/admin" });
}