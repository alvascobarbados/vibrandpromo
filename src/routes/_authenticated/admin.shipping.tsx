import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateShippingSettings } from "@/lib/shipping.functions";
import {
  FALLBACK_SHIPPING,
  airLeadDays,
  seaLeadWeeks,
  shippingSettingsQuery,
  type ShippingSetting,
} from "@/lib/shipping";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  beforeLoad: ({ context }) => {
    if (!context.access.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Shipping Times | Vibrand Admin" },
      {
        name: "description",
        content: "Set the global air and sea shipping windows used to calculate lead times.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShippingPage,
});

const FIELDS = [
  { key: "air_min_days", label: "Air — fastest (days)" },
  { key: "air_max_days", label: "Air — slowest (days)" },
  { key: "sea_min_weeks", label: "Sea — fastest (weeks)" },
  { key: "sea_max_weeks", label: "Sea — slowest (weeks)" },
] as const;

type Draft = Record<string, Record<string, string>>;

function toDraft(rows: ShippingSetting[]): Draft {
  const draft: Draft = {};
  for (const row of rows) {
    draft[row.source] = {
      air_min_days: String(row.air_min_days),
      air_max_days: String(row.air_max_days),
      sea_min_weeks: String(row.sea_min_weeks),
      sea_max_weeks: String(row.sea_max_weeks),
    };
  }
  return draft;
}

function ShippingPage() {
  const queryClient = useQueryClient();
  const settings = useQuery(shippingSettingsQuery);
  const save = useServerFn(updateShippingSettings);
  const [draft, setDraft] = useState<Draft>(() => toDraft(FALLBACK_SHIPPING));

  useEffect(() => {
    if (settings.data?.length) setDraft(toDraft(settings.data));
  }, [settings.data]);

  const mutation = useMutation({
    mutationFn: (rows: ShippingSetting[]) => save({ data: { rows } }),
    onSuccess: async () => {
      toast.success("Shipping times updated.");
      await queryClient.invalidateQueries({ queryKey: ["shipping-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sources = Object.keys(draft);

  function submit() {
    const rows: ShippingSetting[] = [];
    for (const source of sources) {
      const values = draft[source] ?? {};
      const numbers = FIELDS.map(({ key }) => Number((values[key] ?? "").trim()));
      if (numbers.some((n) => !Number.isInteger(n) || n < 0)) {
        toast.error(`${source}: enter whole numbers of 0 or more for every field.`);
        return;
      }
      rows.push({
        source,
        air_min_days: numbers[0] as number,
        air_max_days: numbers[1] as number,
        sea_min_weeks: numbers[2] as number,
        sea_max_weeks: numbers[3] as number,
      });
    }
    mutation.mutate(rows);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Shipping times</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Customer lead times are calculated as each product's production time plus the shipping
        window for its inventory source. Change these and every product updates at once.
      </p>

      <div className="mt-6 space-y-5">
        {sources.map((source) => {
          const values = draft[source] ?? {};
          const example = 15;
          const parsed: ShippingSetting = {
            source,
            air_min_days: Number(values["air_min_days"] ?? 0),
            air_max_days: Number(values["air_max_days"] ?? 0),
            sea_min_weeks: Number(values["sea_min_weeks"] ?? 0),
            sea_max_weeks: Number(values["sea_max_weeks"] ?? 0),
          };
          const air = airLeadDays(example, parsed);
          const sea = seaLeadWeeks(example, parsed);
          return (
            <section key={source} className="rounded-xl border border-border p-4">
              <h2 className="font-semibold">{source}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                {FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <Label htmlFor={`${source}-${key}`} className="text-xs">
                      {label}
                    </Label>
                    <Input
                      id={`${source}-${key}`}
                      type="number"
                      min={0}
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          [source]: { ...(prev[source] ?? {}), [key]: event.target.value },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Example — a product with {example} days production shows air{" "}
                {air ? `${air.min}–${air.max} days` : "On request"} and sea{" "}
                {sea ? `${sea.min}–${sea.max} weeks` : "On request"}.
              </p>
            </section>
          );
        })}
      </div>

      <div className="mt-6">
        <Button onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save shipping times"}
        </Button>
      </div>
    </div>
  );
}
