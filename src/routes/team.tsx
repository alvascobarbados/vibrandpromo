import { createFileRoute, redirect, stripSearchParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { CatalogHome } from "@/components/site/CatalogHome";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/staff.functions";
import { parseCatalogSearch, type CatalogSearch } from "@/lib/catalog-filters";

export const Route = createFileRoute("/team")({
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
  validateSearch: (search: Record<string, unknown>): Partial<CatalogSearch> & {
    page?: number;
  } => ({
    ...parseCatalogSearch(search),
    page: Number(search['page']) > 0 ? Number(search['page']) : 1,
  }),
  search: {
    middlewares: [
      stripSearchParams({
        q: "",
        sort: "default",
        page: 1,
        cat: [],
        sub: [],
        moq: [],
        prod: [],
        colour: [],
        deco: [],
        src: [],
        mat: [],
        ready: [],
      }),
    ],
  },
  head: () => ({
    meta: [
      { title: "Vibrand Supplier — Internal Catalogue" },
      {
        name: "description",
        content: "Internal Vibrand supplier and team catalogue workspace.",
      },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#54565A" },
    ],
  }),
  component: TeamWorkspace,
});

function TeamWorkspace() {
  const page = Route.useSearch().page ?? 1;
  return <CatalogHome page={page} viewMode="supplier" />;
}