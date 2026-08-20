/**
 * /sales/clients — staff clients register.
 *
 * Layout follows the V3-1 clients page (one row per client, inline editing of
 * every field, search by name/contact, add-client at the top right) but is
 * built entirely from our primitives: the shared InlineField editing core for
 * free-text, our styled Select for incoterm / country / payment terms, and the
 * navy + lime tokens. There is deliberately no UI for the stored
 * order_confirmation_config.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { InlineField } from "@/components/team/inline-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clientProposalCountsQuery,
  clientsFullQuery,
  COUNTRY_OPTIONS,
  createClient,
  deleteClient,
  paymentTermsLabel,
  PAYMENT_TERMS,
  updateClient,
  type ClientRow,
} from "@/lib/clients";
import { PROPOSAL_INCOTERMS } from "@/lib/proposals";
import type { Incoterm } from "@/lib/pricing-types";

const NONE = "__none__";

const HEAD = [
  { label: "Name", className: "col-span-2" },
  { label: "Contact", className: "col-span-2" },
  { label: "Phone / Email", className: "col-span-2" },
  { label: "Country", className: "col-span-2" },
  { label: "Incoterm", className: "col-span-1" },
  { label: "Payment terms", className: "col-span-1" },
  { label: "Notes", className: "col-span-2" },
];

function TokenSelect({
  value,
  options,
  placeholder,
  allowNone,
  onChange,
  className,
}: {
  value: string | null;
  options: readonly string[];
  placeholder: string;
  allowNone?: boolean;
  onChange: (next: string | null) => void;
  className?: string;
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) => onChange(next === NONE ? null : next)}
    >
      <SelectTrigger
        className={`h-7 w-full rounded border-navy-200 bg-card px-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-lime-500 ${className ?? ""}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? (
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">—</span>
          </SelectItem>
        ) : null}
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ClientsPage() {
  const queryClient = useQueryClient();
  const clients = useQuery(clientsFullQuery);
  const counts = useQuery(clientProposalCountsQuery);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const save = async (id: string, patch: Partial<ClientRow>) => {
    await updateClient(id, patch);
    await refresh();
  };

  const countries = useMemo(() => {
    const set = new Set<string>(COUNTRY_OPTIONS);
    for (const row of clients.data ?? []) if (row.country) set.add(row.country);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [clients.data]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return clients.data ?? [];
    return (clients.data ?? []).filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        (row.contact_name ?? "").toLowerCase().includes(needle),
    );
  }, [clients.data, search]);

  const add = useMutation({
    mutationFn: (name: string) => createClient(name),
    onSuccess: async (row) => {
      await refresh();
      setNewName("");
      setShowNew(false);
      toast.success(`Client "${row.name}" added.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: async () => {
      await refresh();
      toast.success("Client deleted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function requestDelete(row: ClientRow) {
    const used = counts.data?.[row.id] ?? 0;
    if (used > 0) {
      toast.error(
        `"${row.name}" is used by ${used} proposal${used === 1 ? "" : "s"} — delete or reassign those first.`,
      );
      return;
    }
    remove.mutate(row.id);
  }

  return (
    <div className="mx-auto w-full max-w-[1920px] px-4 py-8">
      <div className="overflow-hidden rounded-2xl border border-n-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Clients</h1>
            <p className="text-[12px] text-n-600">
              {clients.data?.length ?? 0} client{(clients.data?.length ?? 0) === 1 ? "" : "s"} on
              file
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or contact"
              aria-label="Search clients by name or contact"
              className="h-10 w-56 rounded-full"
            />
            <Button
              className="h-10 rounded-full bg-navy-900 text-white hover:bg-navy-800"
              onClick={() => setShowNew((value) => !value)}
            >
              + New client
            </Button>
          </div>
        </div>

        {showNew ? (
          <div className="flex items-center gap-2 border-t border-n-200 bg-navy-50/50 px-4 py-3">
            <Input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && newName.trim()) add.mutate(newName.trim());
              }}
              placeholder="Client name"
              className="h-9 max-w-sm"
            />
            <Button
              variant="outline"
              className="h-9"
              disabled={!newName.trim() || add.isPending}
              onClick={() => add.mutate(newName.trim())}
            >
              {add.isPending ? "Adding…" : "Add client"}
            </Button>
            <span className="text-[11px] text-n-600">
              Name only — fill in the rest inline once it's created.
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-12 gap-2 border-y border-n-200 bg-n-100/70 px-4 py-2">
          {HEAD.map((head) => (
            <span
              key={head.label}
              className={`${head.className} text-[10px] font-bold uppercase tracking-[0.1em] text-n-600`}
            >
              {head.label}
            </span>
          ))}
        </div>

        {clients.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {search ? "No clients match that search." : "No clients yet."}
          </p>
        ) : (
          <ul className="divide-y divide-n-200">
            {rows.map((row) => (
              <li
                key={row.id}
                className="group grid grid-cols-12 items-start gap-2 px-4 py-2 hover:bg-navy-50/40"
              >
                <div className="col-span-2 flex min-w-0 items-start gap-1">
                  <InlineField
                    className="min-w-0 flex-1"
                    value={row.name}
                    wrap
                    display={<span className="font-semibold text-navy-900">{row.name}</span>}
                    validate={(raw) => (raw.trim() ? null : "Name is required")}
                    save={(raw) => save(row.id, { name: raw.trim() })}
                  />
                  <button
                    type="button"
                    aria-label={`Delete ${row.name}`}
                    onClick={() => requestDelete(row)}
                    className="mt-0.5 shrink-0 rounded p-1 text-n-600 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <InlineField
                  className="col-span-2"
                  value={row.contact_name ?? ""}
                  placeholder="Contact name"
                  wrap
                  save={(raw) => save(row.id, { contact_name: raw.trim() || null })}
                />

                <div className="col-span-2 flex min-w-0 flex-col">
                  <InlineField
                    value={row.phone ?? ""}
                    placeholder="Phone"
                    save={(raw) => save(row.id, { phone: raw.trim() || null })}
                  />
                  <InlineField
                    value={row.email ?? ""}
                    placeholder="Email"
                    save={(raw) => save(row.id, { email: raw.trim() || null })}
                  />
                </div>

                <div className="col-span-2">
                  <TokenSelect
                    value={row.country}
                    options={countries}
                    placeholder="—"
                    allowNone
                    onChange={(next) => void save(row.id, { country: next })}
                  />
                </div>

                <div className="col-span-1">
                  <TokenSelect
                    value={row.incoterm}
                    options={PROPOSAL_INCOTERMS}
                    placeholder="—"
                    allowNone
                    onChange={(next) => void save(row.id, { incoterm: next as Incoterm | null })}
                  />
                  {row.incoterm ? (
                    <span className="mt-1 inline-flex rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                      {row.incoterm}
                    </span>
                  ) : (
                    <span className="mt-1 block text-[11px] text-muted-foreground">—</span>
                  )}
                </div>

                <div className="col-span-1">
                  <TokenSelect
                    value={row.payment_terms}
                    options={PAYMENT_TERMS}
                    placeholder="Net 30"
                    onChange={(next) =>
                      void save(row.id, {
                        payment_terms: next ?? "Net 30",
                        payment_terms_custom_days:
                          next === "Custom" ? row.payment_terms_custom_days : null,
                      })
                    }
                  />
                  {row.payment_terms === "Custom" ? (
                    <InlineField
                      className="mt-1"
                      value={row.payment_terms_custom_days?.toString() ?? ""}
                      placeholder="Days"
                      numeric
                      validate={(raw) =>
                        raw.trim() === "" || Number.isInteger(Number(raw))
                          ? null
                          : "Whole number of days"
                      }
                      save={(raw) =>
                        save(row.id, {
                          payment_terms_custom_days: raw.trim() ? Number(raw) : null,
                        })
                      }
                    />
                  ) : (
                    <span className="mt-1 block text-[11px] text-n-600">
                      {paymentTermsLabel(row)}
                    </span>
                  )}
                </div>

                <InlineField
                  className="col-span-2"
                  value={row.notes ?? ""}
                  placeholder="Notes"
                  wrap
                  wrapLines={3}
                  save={(raw) => save(row.id, { notes: raw.trim() || null })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
