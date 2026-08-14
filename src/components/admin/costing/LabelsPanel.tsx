import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InlineField, nonNegative } from "@/components/admin/costing/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { detailLabelsAdminQuery, detailLabelUsageQuery, type DetailLabelRow } from "@/lib/costing";

function friendly(message: string) {
  if (/duplicate key|unique/i.test(message)) return "That label already exists.";
  return message;
}

export function LabelsPanel() {
  const queryClient = useQueryClient();
  const labels = useQuery(detailLabelsAdminQuery);
  const usage = useQuery(detailLabelUsageQuery);
  const [draft, setDraft] = useState("");

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["costing", "detail_labels"] }),
      queryClient.invalidateQueries({ queryKey: ["detail_labels"] }),
    ]);
  };

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: TablesUpdate<"detail_labels"> }) => {
      const { error } = await supabase.from("detail_labels").update(input.patch).eq("id", input.id);
      if (error) throw new Error(friendly(error.message));
    },
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: async () => {
      const label = draft.trim();
      if (!label) throw new Error("Enter a label");
      const { error } = await supabase
        .from("detail_labels")
        .insert({ label, sort_order: (labels.data ?? []).length });
      if (error) throw new Error(friendly(error.message));
    },
    onSuccess: async () => {
      setDraft("");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("detail_labels").delete().eq("id", id);
      if (error) throw new Error(friendly(error.message));
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="max-w-2xl space-y-4">
      <form
        className="flex flex-wrap items-center gap-2 rounded-xl border border-n-200 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        <Input
          className="h-9 flex-1"
          placeholder="New attribute label"
          aria-label="New attribute label"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" size="sm" className="gap-2" disabled={add.isPending}>
          <Plus className="size-4" /> Add label
        </Button>
      </form>

      <div className="rounded-xl border border-n-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-n-200 text-[11px] uppercase tracking-widest text-n-500">
            <tr>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left">Sort</th>
              <th className="px-3 py-2 text-left">In use</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {[...(labels.data ?? [])]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((row: DetailLabelRow) => {
                const used = usage.data?.[row.id] ?? 0;
                return (
                  <tr key={row.id} className="border-b border-n-100 last:border-0">
                    <td className="px-3 py-1.5">
                      <InlineField
                        ariaLabel={`Rename ${row.label}`}
                        value={row.label}
                        onSave={(next) => {
                          const label = next.trim();
                          if (!label) throw new Error("Label required");
                          return update.mutateAsync({ id: row.id, patch: { label } });
                        }}
                      />
                    </td>
                    <td className="w-24 px-3 py-1.5">
                      <InlineField
                        ariaLabel={`Sort order for ${row.label}`}
                        type="number"
                        value={String(row.sort_order)}
                        onSave={(next) =>
                          update.mutateAsync({ id: row.id, patch: { sort_order: nonNegative(next) } })
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{used}</td>
                    <td className="px-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${row.label}`}
                        onClick={() => {
                          if (used > 0) {
                            toast.error(
                              `"${row.label}" is used on ${used} product${used === 1 ? "" : "s"}. Remove those values first.`,
                            );
                            return;
                          }
                          remove.mutate(row.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
