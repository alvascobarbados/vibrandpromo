import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { InlineField } from "@/components/admin/costing/fields";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { appSettingsQuery, SECTION_ORDER, type AppSetting } from "@/lib/costing";

export function RatesPanel() {
  const queryClient = useQueryClient();
  const settings = useQuery(appSettingsQuery);

  const save = useMutation({
    mutationFn: async (input: { id: string; value: string; valueType: string }) => {
      let value = input.value.trim();
      if (input.valueType === "number" || input.valueType === "percent") {
        const parsed = Number(value);
        if (value === "" || !Number.isFinite(parsed)) throw new Error("Enter a valid number");
        value = String(parsed);
      }
      const { error } = await supabase
        .from("app_settings")
        .update({ value })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["costing", "app_settings"] }),
  });

  if (settings.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  const rows = settings.data ?? [];
  const sections = [...new Set(rows.map((row) => row.section))].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a);
    const bi = SECTION_ORDER.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section} className="rounded-xl border border-n-200 bg-white">
          <header className="border-b border-n-200 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-n-500">
            {section}
          </header>
          <table className="w-full text-sm">
            <tbody>
              {rows
                .filter((row) => row.section === section)
                .sort((a, b) => a.display_order - b.display_order)
                .map((row: AppSetting) => (
                  <tr key={row.id} className="border-b border-n-100 last:border-0 align-top">
                    <td className="w-1/2 px-4 py-2">
                      <p className="font-medium text-n-900">{row.display_label ?? row.key}</p>
                      {row.description ? (
                        <p className="text-xs text-muted-foreground">{row.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      <InlineField
                        ariaLabel={row.display_label ?? row.key}
                        value={row.value ?? ""}
                        type={row.value_type === "text" ? "text" : "number"}
                        align="right"
                        {...(row.value_type === "percent" ? { suffix: "%" } : {})}
                        className="max-w-40"
                        onSave={(next) =>
                          save.mutateAsync({ id: row.id, value: next, valueType: row.value_type })
                        }
                      />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{row.key}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
