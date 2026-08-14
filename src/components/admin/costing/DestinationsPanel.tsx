import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InlineField } from "@/components/admin/costing/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { destinationsQuery, shippingRoutesQuery, type DestinationRow } from "@/lib/costing";

export function DestinationsPanel() {
  const queryClient = useQueryClient();
  const destinations = useQuery(destinationsQuery);
  const routes = useQuery(shippingRoutesQuery);
  const [draft, setDraft] = useState({ code: "", name: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["costing", "destinations"] });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: TablesUpdate<"destinations"> }) => {
      const { error } = await supabase.from("destinations").update(input.patch).eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: async () => {
      const code = draft.code.trim().toUpperCase();
      if (!code || !draft.name.trim()) throw new Error("Code and name are required");
      const { error } = await supabase
        .from("destinations")
        .insert({ code, name: draft.name.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      setDraft({ code: "", name: "" });
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("destinations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  function routeCount(destinationId: string) {
    return (routes.data ?? []).filter((route) => route.destination_id === destinationId).length;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <form
        className="flex flex-wrap items-center gap-2 rounded-xl border border-n-200 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        <Input
          className="h-9 w-28"
          placeholder="Code"
          aria-label="New destination code"
          value={draft.code}
          onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))}
        />
        <Input
          className="h-9 flex-1"
          placeholder="Name"
          aria-label="New destination name"
          value={draft.name}
          onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
        />
        <Button type="submit" size="sm" className="gap-2" disabled={add.isPending}>
          <Plus className="size-4" /> Add destination
        </Button>
      </form>

      <div className="rounded-xl border border-n-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-n-200 text-[11px] uppercase tracking-widest text-n-500">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2 text-left">Routes</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {(destinations.data ?? []).map((destination: DestinationRow) => {
              const used = routeCount(destination.id);
              return (
                <tr key={destination.id} className="border-b border-n-100 last:border-0">
                  <td className="w-28 px-3 py-1.5">
                    <InlineField
                      ariaLabel={`Code for ${destination.name}`}
                      value={destination.code}
                      onSave={(next) =>
                        update.mutateAsync({
                          id: destination.id,
                          patch: { code: next.trim().toUpperCase() },
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <InlineField
                      ariaLabel={`Name for ${destination.code}`}
                      value={destination.name}
                      onSave={(next) =>
                        update.mutateAsync({ id: destination.id, patch: { name: next.trim() } })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <InlineField
                      ariaLabel={`Notes for ${destination.code}`}
                      value={destination.notes ?? ""}
                      onSave={(next) =>
                        update.mutateAsync({ id: destination.id, patch: { notes: next } })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{used}</td>
                  <td className="px-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${destination.code}`}
                      onClick={() => {
                        if (used > 0) {
                          toast.error(
                            `${destination.code} is used by ${used} shipping route${used === 1 ? "" : "s"}. Remove those routes first.`,
                          );
                          return;
                        }
                        remove.mutate(destination.id);
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
