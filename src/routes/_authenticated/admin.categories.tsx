import { requirePage } from "@/lib/admin-guard";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { categoryDutyQuery } from "@/lib/costing";
import {
  allProductsQuery,
  categoriesQuery,
  slugify,
  subcategoriesQuery,
  type Category,
  type Subcategory,
} from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  beforeLoad: ({ context }) => requirePage(context.access, "categories"),
  head: () => ({
    meta: [
      { title: "Categories | Vibrand Admin" },
      { name: "description", content: "Create and manage product categories." },
      { property: "og:title", content: "Categories | Vibrand Admin" },
      { property: "og:description", content: "Manage Vibrand product categories." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCategories,
});

type PendingDelete = {
  kind: "category" | "subcategory";
  id: string;
  name: string;
};

/** Inline duty % editor. Empty shows an em dash; blank subcategories hint at the parent value. */
function DutyField({
  label,
  value,
  inherited,
  onSave,
}: {
  label: string;
  value: number | null;
  inherited: number | null;
  onSave: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button
        type="button"
        aria-label={`Duty percent for ${label}`}
        onClick={() => setDraft(value === null ? "" : String(value))}
        className="shrink-0 rounded-md border border-transparent px-2 py-1 text-xs tabular-nums hover:border-border hover:bg-secondary"
      >
        <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground">Duty</span>
        {value !== null ? (
          <span className="font-medium">{value}%</span>
        ) : inherited !== null ? (
          <span className="text-muted-foreground/70">{inherited}%</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </button>
    );
  }

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      if (value !== null) onSave(null);
      setDraft(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Duty % must be a number between 0 and 100.");
      return;
    }
    if (parsed !== value) onSave(parsed);
    setDraft(null);
  };

  return (
    <Input
      autoFocus
      type="number"
      aria-label={`Duty percent for ${label}`}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
        if (event.key === "Escape") setDraft(null);
      }}
      className="h-8 w-20 shrink-0 text-xs"
    />
  );
}

function AdminCategories() {
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const products = useQuery(allProductsQuery);
  const duty = useQuery(categoryDutyQuery);

  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newSub, setNewSub] = useState<{ categoryId: string; value: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [dragging, setDragging] = useState<{ kind: string; id: string } | null>(null);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      queryClient.invalidateQueries({ queryKey: ["subcategories"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
    ]);
  };

  const saveDuty = useMutation({
    mutationFn: async (input: {
      table: "categories" | "subcategories";
      id: string;
      value: number | null;
    }) => {
      const { error } = await supabase
        .from(input.table)
        .update({ duty_rate_pct: input.value })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["costing", "category_duty"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const dutyCell = (
    table: "categories" | "subcategories",
    id: string,
    name: string,
    inherited?: number | null,
  ) => {
    const own =
      table === "categories" ? (duty.data?.categories[id] ?? null) : (duty.data?.subcategories[id] ?? null);
    return (
      <DutyField
        label={name}
        value={own}
        inherited={inherited ?? null}
        onSave={(value) => saveDuty.mutate({ table, id, value })}
      />
    );
  };

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    const bySub = new Map<string, number>();
    for (const product of products.data ?? []) {
      if (product.category_id)
        byCategory.set(product.category_id, (byCategory.get(product.category_id) ?? 0) + 1);
      if (product.subcategory_id)
        bySub.set(product.subcategory_id, (bySub.get(product.subcategory_id) ?? 0) + 1);
    }
    return { byCategory, bySub };
  }, [products.data]);

  const subsByCategory = useMemo(() => {
    const map = new Map<string, Subcategory[]>();
    for (const sub of subcategories.data ?? []) {
      map.set(sub.category_id, [...(map.get(sub.category_id) ?? []), sub]);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [subcategories.data]);

  const useRowMutation = <T,>(fn: (input: T) => Promise<void>, success: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: async () => {
        toast.success(success);
        await invalidate();
      },
      onError: (error: Error) => toast.error(error.message),
    });

  const addCategory = useRowMutation(async (name: string) => {
    const sortOrder = (categories.data ?? []).length;
    const { error } = await supabase
      .from("categories")
      .insert({ name, slug: slugify(name), sort_order: sortOrder });
    if (error) throw new Error(error.message);
  }, "Category added");

  const addSubcategory = useRowMutation(async (input: { categoryId: string; name: string }) => {
    const sortOrder = (subsByCategory.get(input.categoryId) ?? []).length;
    const { error } = await supabase.from("subcategories").insert({
      name: input.name,
      slug: slugify(input.name),
      category_id: input.categoryId,
      sort_order: sortOrder,
    });
    if (error) throw new Error(error.message);
  }, "Subcategory added");

  const renameRow = useRowMutation(
    async (input: { table: "categories" | "subcategories"; id: string; name: string }) => {
      const { error } = await supabase
        .from(input.table)
        .update({ name: input.name, slug: slugify(input.name) })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    "Name updated",
  );

  const reorder = useRowMutation(
    async (input: {
      table: "categories" | "subcategories";
      rows: { id: string; sort_order: number }[];
    }) => {
      for (const row of input.rows) {
        const { error } = await supabase
          .from(input.table)
          .update({ sort_order: row.sort_order })
          .eq("id", row.id);
        if (error) throw new Error(error.message);
      }
    },
    "Order saved",
  );

  const removeRow = useRowMutation(
    async (input: { table: "categories" | "subcategories"; id: string }) => {
      const { error } = await supabase.from(input.table).delete().eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    "Deleted",
  );

  function toggle(id: string) {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function askDelete(kind: PendingDelete["kind"], id: string, name: string) {
    const count =
      kind === "category" ? (counts.byCategory.get(id) ?? 0) : (counts.bySub.get(id) ?? 0);
    if (kind === "category") {
      const subs = subsByCategory.get(id) ?? [];
      if (subs.length > 0) {
        toast.error(
          `"${name}" still has ${subs.length} subcategor${subs.length === 1 ? "y" : "ies"}. Delete or move those first.`,
        );
        return;
      }
    }
    if (count > 0) {
      toast.error(
        `"${name}" still has ${count} product${count === 1 ? "" : "s"}. Move those products to another ${kind === "category" ? "category" : "subcategory"} first.`,
      );
      return;
    }
    setPendingDelete({ kind, id, name });
  }

  function handleDrop(
    table: "categories" | "subcategories",
    list: { id: string }[],
    targetId: string,
  ) {
    if (!dragging || dragging.id === targetId) return;
    const from = list.findIndex((row) => row.id === dragging.id);
    const to = list.findIndex((row) => row.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    setDragging(null);
    reorder.mutate({
      table,
      rows: next.map((row, index) => ({ id: row.id, sort_order: index })),
    });
  }

  const loading = categories.isLoading || subcategories.isLoading;
  const categoryList: Category[] = [...(categories.data ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="max-w-4xl">
      <p className="text-sm text-muted-foreground">
        Drag the handles to reorder. Expand a category to manage the subcategories underneath it.
      </p>

      <form
        className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!newCategory.trim()) return;
          addCategory.mutate(newCategory.trim());
          setNewCategory("");
        }}
      >
        <Input
          className="min-w-48 flex-1"
          placeholder="New category name"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
        />
        <Button type="submit" className="gap-2" disabled={addCategory.isPending}>
          <Plus className="size-4" /> Add category
        </Button>
      </form>

      <div className="mt-5 space-y-2">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))
          : categoryList.map((category) => {
              const subs = subsByCategory.get(category.id) ?? [];
              const isOpen = expanded.includes(category.id);
              const isEditing = editing?.id === category.id;
              return (
                <div
                  key={category.id}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("categories", categoryList, category.id)}
                >
                  <div className="flex items-center gap-2 px-3 py-3">
                    <span
                      draggable
                      onDragStart={() => setDragging({ kind: "category", id: category.id })}
                      className="cursor-grab text-muted-foreground"
                      aria-label={`Reorder ${category.name}`}
                    >
                      <GripVertical className="size-4" />
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(category.id)}
                      className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-secondary"
                      aria-label={isOpen ? "Collapse" : "Expand"}
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>

                    {isEditing ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Input
                          autoFocus
                          value={editing.value}
                          onChange={(event) =>
                            setEditing({ id: category.id, value: event.target.value })
                          }
                        />
                        <Button
                          size="icon"
                          aria-label="Save name"
                          onClick={() => {
                            if (!editing.value.trim()) return;
                            renameRow.mutate({
                              table: "categories",
                              id: category.id,
                              name: editing.value.trim(),
                            });
                            setEditing(null);
                          }}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Cancel rename"
                          onClick={() => setEditing(null)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => toggle(category.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate font-semibold">{category.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {counts.byCategory.get(category.id) ?? 0} products · {subs.length}{" "}
                            subcategories
                          </span>
                        </button>
                        {dutyCell("categories", category.id, category.name)}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Rename ${category.name}`}
                          onClick={() => setEditing({ id: category.id, value: category.name })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => askDelete("category", category.id, category.name)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {isOpen ? (
                    <div className="border-t border-border bg-secondary/40 py-2 pl-10 pr-3">
                      <ul className="space-y-1 border-l border-border pl-4">
                        {subs.map((sub) => {
                          const subEditing = editing?.id === sub.id;
                          return (
                            <li
                              key={sub.id}
                              className="flex items-center gap-2 rounded-lg bg-card px-3 py-2"
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => handleDrop("subcategories", subs, sub.id)}
                            >
                              <span
                                draggable
                                onDragStart={() => setDragging({ kind: "sub", id: sub.id })}
                                className="cursor-grab text-muted-foreground"
                                aria-label={`Reorder ${sub.name}`}
                              >
                                <GripVertical className="size-4" />
                              </span>
                              {subEditing ? (
                                <>
                                  <Input
                                    autoFocus
                                    value={editing.value}
                                    onChange={(event) =>
                                      setEditing({ id: sub.id, value: event.target.value })
                                    }
                                  />
                                  <Button
                                    size="icon"
                                    aria-label="Save name"
                                    onClick={() => {
                                      if (!editing.value.trim()) return;
                                      renameRow.mutate({
                                        table: "subcategories",
                                        id: sub.id,
                                        name: editing.value.trim(),
                                      });
                                      setEditing(null);
                                    }}
                                  >
                                    <Check className="size-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Cancel rename"
                                    onClick={() => setEditing(null)}
                                  >
                                    <X className="size-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{sub.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {counts.bySub.get(sub.id) ?? 0} products
                                    </p>
                                  </div>
                                  {dutyCell(
                                    "subcategories",
                                    sub.id,
                                    sub.name,
                                    duty.data?.categories[category.id] ?? null,
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Rename ${sub.name}`}
                                    onClick={() => setEditing({ id: sub.id, value: sub.name })}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Delete ${sub.name}`}
                                    onClick={() => askDelete("subcategory", sub.id, sub.name)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
                            </li>
                          );
                        })}
                        {subs.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-muted-foreground">
                            No subcategories yet.
                          </li>
                        ) : null}
                      </ul>

                      {newSub?.categoryId === category.id ? (
                        <form
                          className="mt-2 flex items-center gap-2 pl-4"
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (!newSub.value.trim()) return;
                            addSubcategory.mutate({
                              categoryId: category.id,
                              name: newSub.value.trim(),
                            });
                            setNewSub(null);
                          }}
                        >
                          <Input
                            autoFocus
                            placeholder="Subcategory name"
                            value={newSub.value}
                            onChange={(event) =>
                              setNewSub({ categoryId: category.id, value: event.target.value })
                            }
                          />
                          <Button type="submit" size="sm">
                            Add
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setNewSub(null)}
                          >
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-4 mt-2 gap-2"
                          onClick={() => setNewSub({ categoryId: category.id, value: "" })}
                        >
                          <Plus className="size-4" /> Add subcategory
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. It is empty, so no products will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDelete) return;
                removeRow.mutate({
                  table: pendingDelete.kind === "category" ? "categories" : "subcategories",
                  id: pendingDelete.id,
                });
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
