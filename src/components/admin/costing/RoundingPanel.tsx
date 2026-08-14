import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { InlineField, nonNegative, numberOrNull } from "@/components/admin/costing/fields";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { roundingRulesQuery, type RoundingRuleRow } from "@/lib/costing";

export function RoundingPanel() {
  const queryClient = useQueryClient();
  const rules = useQuery(roundingRulesQuery);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["costing", "rounding_rules"] });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: TablesUpdate<"rounding_rules"> }) => {
      const { error } = await supabase
        .from("rounding_rules")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: async () => {
      const next = (rules.data ?? []).length;
      const { error } = await supabase.from("rounding_rules").insert({
        band_min: 0,
        band_max: null,
        round_up_to: 1,
        description: "",
        display_order: next,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rounding_rules").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="rounded-xl border border-n-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-n-200 text-[11px] uppercase tracking-widest text-n-500">
          <tr>
            <th className="px-3 py-2 text-left">Band min</th>
            <th className="px-3 py-2 text-left">Band max</th>
            <th className="px-3 py-2 text-left">Round up to</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="px-3 py-2 text-left">Order</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {[...(rules.data ?? [])]
            .sort((a, b) => a.display_order - b.display_order)
            .map((rule: RoundingRuleRow) => (
              <tr key={rule.id} className="border-b border-n-100 last:border-0">
                <td className="px-3 py-1.5">
                  <InlineField
                    ariaLabel="Band min"
                    type="number"
                    value={String(rule.band_min)}
                    onSave={(next) =>
                      update.mutateAsync({ id: rule.id, patch: { band_min: nonNegative(next) } })
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <InlineField
                    ariaLabel="Band max"
                    type="number"
                    placeholder="open"
                    value={rule.band_max === null ? "" : String(rule.band_max)}
                    onSave={(next) =>
                      update.mutateAsync({ id: rule.id, patch: { band_max: numberOrNull(next) } })
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <InlineField
                    ariaLabel="Round up to"
                    type="number"
                    value={String(rule.round_up_to)}
                    onSave={(next) =>
                      update.mutateAsync({ id: rule.id, patch: { round_up_to: nonNegative(next) } })
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <InlineField
                    ariaLabel="Description"
                    value={rule.description ?? ""}
                    onSave={(next) =>
                      update.mutateAsync({ id: rule.id, patch: { description: next } })
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <InlineField
                    ariaLabel="Display order"
                    type="number"
                    className="max-w-20"
                    value={String(rule.display_order)}
                    onSave={(next) =>
                      update.mutateAsync({
                        id: rule.id,
                        patch: { display_order: nonNegative(next) },
                      })
                    }
                  />
                </td>
                <td className="px-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete rounding rule"
                    onClick={() => remove.mutate(rule.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <div className="border-t border-n-200 p-2">
        <Button size="sm" variant="ghost" className="gap-2" onClick={() => add.mutate()}>
          <Plus className="size-4" /> Add band
        </Button>
      </div>
    </div>
  );
}
