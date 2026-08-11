import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, slugify } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({
    meta: [
      { title: "Categories | Alvasco Admin" },
      { name: "description", content: "Create and manage product categories." },
      { property: "og:title", content: "Categories | Alvasco Admin" },
      { property: "og:description", content: "Manage Alvasco product categories." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCategories,
});

function AdminCategories() {
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("categories")
        .insert({ name, slug: slugify(name), sort_order: Number(sortOrder) || 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Category added");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Categories</h1>

      <form
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          create.mutate();
        }}
      >
        <div className="min-w-56 flex-1">
          <Label htmlFor="name">Category name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="w-28">
          <Label htmlFor="sort">Sort</Label>
          <Input
            id="sort"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          Add category
        </Button>
      </form>

      <div className="mt-6 space-y-2">
        {categories.isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))
          : (categories.data ?? []).map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">/{category.slug}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => remove.mutate(category.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
      </div>
    </div>
  );
}