import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/staff.functions";

/**
 * Staff gate for the whole /sales tree — same shape as /team: client-only
 * session read, then the is_staff check through the existing access fn.
 */
export const Route = createFileRoute("/sales")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      toast.error("This account doesn't have admin access.");
      throw redirect({ to: "/" });
    }
    const access = await getMyAccess().catch(() => null);
    if (!access?.isStaff) {
      toast.error("This account doesn't have admin access.");
      throw redirect({ to: "/" });
    }
    return { access };
  },
  component: () => <Outlet />,
});