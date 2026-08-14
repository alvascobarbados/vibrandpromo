import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  MoreVertical,
  Plane,
  Plus,
  Search,
  Ship,
  Trash2,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

import { InlineField, nonNegative, numberOrNull } from "@/components/admin/costing/fields";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  CHARGEABLE_METRICS,
  TRANSPORT_MODES,
  defaultTransportMode,
  originsListQuery,
  destinationsQuery,
  shippingMethodsQuery,
  shippingRoutesQuery,
  shippingTiersQuery,
  tierLadderWarnings,
  type RouteRow,
  type ShippingMethodRow,
} from "@/lib/costing";
import { snapUnit, unitsForMetric } from "@/lib/units";

export function RoutesPanel() {
  const queryClient = useQueryClient();
  const methods = useQuery(shippingMethodsQuery);
  const routes = useQuery(shippingRoutesQuery);
  const tiers = useQuery(shippingTiersQuery);
  const origins = useQuery(originsListQuery);
  const destinations = useQuery(destinationsQuery);
  const [open, setOpen] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<
    { kind: "method" | "route"; id: string; label: string } | null
  >(null);

  const invalidate = (table: string) =>
    queryClient.invalidateQueries({ queryKey: ["costing", table] });

  const addMethod = useMutation({
    mutationFn: async () => {
      const existing = new Set((methods.data ?? []).map((method) => method.code));
      let code = "NEW";
      let counter = 1;
      while (existing.has(code)) {
        counter += 1;
        code = `NEW${counter}`;
      }
      const { error } = await supabase.from("shipping_methods").insert({
        code,
        name: "New Method",
        fuel_surcharge_pct: 0,
        buffer_pct: 0,
        chargeable_metric: "CHARGEABLE_WEIGHT",
        chargeable_unit: "LBS",
        transport_mode: defaultTransportMode("CHARGEABLE_WEIGHT"),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate("shipping_methods"),
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_methods").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate("shipping_methods");
      invalidate("shipping_method_routes");
      invalidate("shipping_method_tiers");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addRoute = useMutation({
    mutationFn: async (methodId: string) => {
      const origin = (origins.data ?? [])[0];
      const destination = (destinations.data ?? [])[0];
      if (!origin || !destination) throw new Error("Add an origin and destination first");
      const { error } = await supabase.from("shipping_method_routes").insert({
        shipping_method_id: methodId,
        origin_id: origin.id,
        destination_id: destination.id,
        fixed_cost: 0,
        lac_fixed_bbd: 0,
        lac_per_cbm_bbd: 0,
        include_inland_freight: false,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate("shipping_method_routes"),
    onError: (error: Error) => toast.error(error.message),
  });

  const removeRoute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_method_routes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate("shipping_method_routes");
      invalidate("shipping_method_tiers");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMethod = useMutation({
    mutationFn: async (input: { id: string; patch: TablesUpdate<"shipping_methods"> }) => {
      const { error } = await supabase
        .from("shipping_methods")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate("shipping_methods"),
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRoute = useMutation({
    mutationFn: async (input: { id: string; patch: TablesUpdate<"shipping_method_routes"> }) => {
      const { error } = await supabase
        .from("shipping_method_routes")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate("shipping_method_routes"),
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTier = useMutation({
    mutationFn: async (input: { id: string; patch: TablesUpdate<"shipping_method_tiers"> }) => {
      const { error } = await supabase
        .from("shipping_method_tiers")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate("shipping_method_tiers"),
  });

  const addTier = useMutation({
    mutationFn: async (routeId: string) => {
      const ladder = (tiers.data ?? []).filter((tier) => tier.route_id === routeId);
      const last = ladder[ladder.length - 1];
      const { error } = await supabase.from("shipping_method_tiers").insert({
        route_id: routeId,
        band_from: last?.band_to ?? 0,
        band_to: null,
        rate: 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate("shipping_method_tiers"),
    onError: (error: Error) => toast.error(error.message),
  });

  const removeTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_method_tiers").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate("shipping_method_tiers"),
    onError: (error: Error) => toast.error(error.message),
  });

  function toggle(id: string) {
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const originById = useMemo(
    () => new Map((origins.data ?? []).map((origin) => [origin.id, origin])),
    [origins.data],
  );
  const destinationById = useMemo(
    () => new Map((destinations.data ?? []).map((destination) => [destination.id, destination])),
    [destinations.data],
  );

  const term = search.trim().toLowerCase();
  function routeMatches(route: RouteRow) {
    if (!term) return true;
    const origin = originById.get(route.origin_id);
    const destination = destinationById.get(route.destination_id);
    return [origin?.code, origin?.name, destination?.code, destination?.name]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-n-500" />
          <Input
            aria-label="Search methods and routes"
            placeholder="Search method, origin or destination"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
        <Button size="sm" className="gap-2" onClick={() => addMethod.mutate()}>
          <Plus className="size-4" /> Add Method
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-n-200 bg-navy-50/60 px-3 py-2 text-[12px] text-n-600">
        <Info className="mt-0.5 size-4 shrink-0 text-n-500" />
        <p>
          Tier ranges are inclusive at the lower bound and exclusive at the upper bound. A value
          equal to a tier&apos;s upper limit moves to the next tier.
        </p>
      </div>

      {(methods.data ?? []).map((method: ShippingMethodRow) => {
        const methodRoutes = (routes.data ?? []).filter(
          (route) => route.shipping_method_id === method.id,
        );
        const methodMatches =
          !term ||
          method.name.toLowerCase().includes(term) ||
          method.code.toLowerCase().includes(term);
        const visibleRoutes = methodMatches ? methodRoutes : methodRoutes.filter(routeMatches);
        if (term && !methodMatches && visibleRoutes.length === 0) return null;
        return (
          <section key={method.id} className="rounded-xl border border-n-200 bg-white">
            <header className="flex flex-wrap items-end gap-4 border-b border-n-200 px-4 py-3">
              <div>
                <InlineField
                  ariaLabel={`Code for ${method.code}`}
                  value={method.code}
                  className="w-28"
                  onSave={(next) =>
                    updateMethod.mutateAsync({
                      id: method.id,
                      patch: { code: next.trim().toUpperCase() },
                    })
                  }
                />
                <InlineField
                  ariaLabel={`Name for ${method.code}`}
                  value={method.name}
                  className="mt-1 w-56"
                  onSave={(next) =>
                    updateMethod.mutateAsync({ id: method.id, patch: { name: next.trim() } })
                  }
                />
              </div>
              <Labelled label="Fuel %">
                <InlineField
                  ariaLabel={`Fuel surcharge for ${method.code}`}
                  type="number"
                  align="right"
                  className="w-24"
                  value={String(method.fuel_surcharge_pct)}
                  onSave={(next) =>
                    updateMethod.mutateAsync({
                      id: method.id,
                      patch: { fuel_surcharge_pct: nonNegative(next) },
                    })
                  }
                />
              </Labelled>
              <Labelled label="Buffer %">
                <InlineField
                  ariaLabel={`Buffer for ${method.code}`}
                  type="number"
                  align="right"
                  className="w-24"
                  value={String(method.buffer_pct)}
                  onSave={(next) =>
                    updateMethod.mutateAsync({
                      id: method.id,
                      patch: { buffer_pct: nonNegative(next) },
                    })
                  }
                />
              </Labelled>
              <Labelled label="Chargeable metric">
                <Select
                  value={method.chargeable_metric}
                  onValueChange={(value) =>
                    updateMethod.mutate({
                      id: method.id,
                      patch: {
                        chargeable_metric: value,
                        chargeable_unit: snapUnit(value, method.chargeable_unit),
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-52 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHARGEABLE_METRICS.map((metric) => (
                      <SelectItem key={metric} value={metric}>
                        {metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labelled>
              <Labelled label="Mode">
                <Select
                  value={method.transport_mode}
                  onValueChange={(value) =>
                    updateMethod.mutate({ id: method.id, patch: { transport_mode: value } })
                  }
                >
                  <SelectTrigger
                    className="h-8 w-24 text-xs"
                    aria-label={`Transport mode for ${method.code}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        <span className="flex items-center gap-1.5">
                          {mode === "air" ? (
                            <Plane className="size-3.5" />
                          ) : (
                            <Ship className="size-3.5" />
                          )}
                          {mode === "air" ? "Air" : "Sea"}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labelled>
              <Labelled label="Unit">
                <Select
                  value={snapUnit(method.chargeable_metric, method.chargeable_unit)}
                  onValueChange={(value) =>
                    updateMethod.mutate({ id: method.id, patch: { chargeable_unit: value } })
                  }
                >
                  <SelectTrigger
                    className="h-8 w-24 text-xs"
                    aria-label={`Chargeable unit for ${method.code}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsForMetric(method.chargeable_metric).map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labelled>
              <div className="ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label={`Actions for ${method.code}`}>
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[60]">
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() =>
                        setConfirm({ kind: "method", id: method.id, label: method.name })
                      }
                    >
                      <Trash2 className="mr-2 size-4" /> Delete method
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            <table className="w-full text-sm">
              <thead className="border-b border-n-100 text-[11px] uppercase tracking-widest text-n-500">
                <tr>
                  <th className="w-8" />
                  <th className="px-3 py-2 text-left">Origin</th>
                  <th className="px-3 py-2 text-left">Destination</th>
                  <th className="px-3 py-2 text-left">Fixed cost</th>
                  <th className="px-3 py-2 text-left">LAC fixed (BBD)</th>
                  <th className="px-3 py-2 text-left">LAC / CBM (BBD)</th>
                  <th className="px-3 py-2 text-left">Inland freight</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visibleRoutes.map((route: RouteRow) => {
                  const ladder = [...(tiers.data ?? [])]
                    .filter((tier) => tier.route_id === route.id)
                    .sort((a, b) => a.band_from - b.band_from);
                  const warnings = tierLadderWarnings(ladder);
                  const isOpen = open.includes(route.id);
                  return (
                    <Fragment key={route.id}>
                      <tr className="border-b border-n-100">
                        <td className="pl-2">
                          <button
                            type="button"
                            aria-label={isOpen ? "Collapse tiers" : "Expand tiers"}
                            onClick={() => toggle(route.id)}
                            className="rounded p-1 text-n-500 hover:bg-navy-50"
                          >
                            {isOpen ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={route.origin_id}
                            onValueChange={(value) =>
                              updateRoute.mutate({ id: route.id, patch: { origin_id: value } })
                            }
                          >
                            <SelectTrigger className="h-8 w-40 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(origins.data ?? []).map((origin) => (
                                <SelectItem key={origin.id} value={origin.id}>
                                  {origin.code} — {origin.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={route.destination_id}
                            onValueChange={(value) =>
                              updateRoute.mutate({ id: route.id, patch: { destination_id: value } })
                            }
                          >
                            <SelectTrigger className="h-8 w-40 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(destinations.data ?? []).map((destination) => (
                                <SelectItem key={destination.id} value={destination.id}>
                                  {destination.code} — {destination.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-1.5">
                          <InlineField
                            ariaLabel="Fixed cost"
                            type="number"
                            align="right"
                            className="w-28"
                            value={String(route.fixed_cost)}
                            onSave={(next) =>
                              updateRoute.mutateAsync({
                                id: route.id,
                                patch: { fixed_cost: nonNegative(next) },
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <InlineField
                            ariaLabel="LAC fixed BBD"
                            type="number"
                            align="right"
                            className="w-28"
                            value={String(route.lac_fixed_bbd)}
                            onSave={(next) =>
                              updateRoute.mutateAsync({
                                id: route.id,
                                patch: { lac_fixed_bbd: nonNegative(next) },
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <InlineField
                            ariaLabel="LAC per CBM BBD"
                            type="number"
                            align="right"
                            className="w-28"
                            value={String(route.lac_per_cbm_bbd)}
                            onSave={(next) =>
                              updateRoute.mutateAsync({
                                id: route.id,
                                patch: { lac_per_cbm_bbd: nonNegative(next) },
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Switch
                            aria-label="Include inland freight"
                            checked={route.include_inland_freight}
                            onCheckedChange={(checked) =>
                              updateRoute.mutate({
                                id: route.id,
                                patch: { include_inland_freight: checked },
                              })
                            }
                          />
                        </td>
                      <td className="px-2 py-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" aria-label="Route actions">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[60]">
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() =>
                                  setConfirm({
                                    kind: "route",
                                    id: route.id,
                                    label: `${originById.get(route.origin_id)?.code ?? "?"} → ${
                                      destinationById.get(route.destination_id)?.code ?? "?"
                                    }`,
                                  })
                                }
                              >
                                <Trash2 className="mr-2 size-4" /> Delete route
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-n-100 bg-navy-50/60">
                          <td />
                          <td colSpan={7} className="px-3 py-3">
                            {warnings.length > 0 ? (
                              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                                <AlertTriangle className="size-3.5" />
                                {warnings.join(" ")}
                              </div>
                            ) : null}
                            <table className="w-full max-w-xl text-xs">
                              <thead className="text-[11px] uppercase tracking-widest text-n-500">
                                <tr>
                                  <th className="px-2 py-1 text-left">Band from</th>
                                  <th className="px-2 py-1 text-left">Band to</th>
                                  <th className="px-2 py-1 text-left">Rate</th>
                                  <th className="w-8" />
                                </tr>
                              </thead>
                              <tbody>
                                {ladder.map((tier) => (
                                  <tr key={tier.id}>
                                    <td className="px-2 py-1">
                                      <InlineField
                                        ariaLabel="Band from"
                                        type="number"
                                        value={String(tier.band_from)}
                                        onSave={(next) =>
                                          updateTier.mutateAsync({
                                            id: tier.id,
                                            patch: { band_from: nonNegative(next) },
                                          })
                                        }
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <InlineField
                                        ariaLabel="Band to"
                                        type="number"
                                        placeholder="open"
                                        value={tier.band_to === null ? "" : String(tier.band_to)}
                                        onSave={(next) => {
                                          const parsed = numberOrNull(next);
                                          if (parsed !== null && parsed < 0)
                                            throw new Error("Must be 0 or more");
                                          if (parsed !== null && parsed <= tier.band_from)
                                            throw new Error("Band to must exceed band from");
                                          return updateTier.mutateAsync({
                                            id: tier.id,
                                            patch: { band_to: parsed },
                                          });
                                        }}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <InlineField
                                        ariaLabel="Rate"
                                        type="number"
                                        suffix={`/ ${unitLabel(method.chargeable_unit)}`}
                                        value={String(tier.rate)}
                                        onSave={(next) =>
                                          updateTier.mutateAsync({
                                            id: tier.id,
                                            patch: { rate: nonNegative(next) },
                                          })
                                        }
                                      />
                                    </td>
                                    <td>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Delete tier"
                                        onClick={() => removeTier.mutate(tier.id)}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                                {ladder.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="px-2 py-2 text-muted-foreground">
                                      No tiers yet.
                                    </td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-1 gap-2"
                              onClick={() => addTier.mutate(route.id)}
                            >
                              <Plus className="size-4" /> Add tier
                            </Button>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {visibleRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-3 text-sm text-muted-foreground">
                      {term ? "No routes match your search." : "No routes for this method."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <div className="border-t border-n-200 p-2">
              <Button
                size="sm"
                variant="ghost"
                className="gap-2"
                onClick={() => addRoute.mutate(method.id)}
              >
                <Plus className="size-4" /> Add Route
              </Button>
            </div>
          </section>
        );
      })}

      <AlertDialog open={confirm !== null} onOpenChange={(next) => !next && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "method"
                ? `Delete method “${confirm?.label}”?`
                : `Delete route ${confirm?.label}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "method"
                ? "All routes and tiers under this method will also be deleted. This cannot be undone."
                : "All tiers under this route will also be deleted. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "method") removeMethod.mutate(confirm.id);
                else removeRoute.mutate(confirm.id);
                setConfirm(null);
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

/** Singularises weight units for tier rate suffixes ("LBS" → "lb"). */
function unitLabel(unit: string): string {
  const trimmed = unit.trim().toUpperCase();
  if (trimmed === "LBS") return "lb";
  if (trimmed === "KG") return "kg";
  return trimmed;
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-n-500">{label}</p>
      {children}
    </div>
  );
}
