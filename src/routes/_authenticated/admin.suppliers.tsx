import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Archive, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { requirePage } from "@/lib/admin-guard";
import {
  SHIPPING_MODES,
  UNIT_SYSTEMS,
  productSourcingQuery,
  supplierCodeProblem,
  suppliersQuery,
  type Supplier,
} from "@/lib/sourcing";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  beforeLoad: ({ context }) => requirePage(context.access, "products"),
  head: () => ({
    meta: [
      { title: "Suppliers | Vibrand Admin" },
      { name: "description", content: "Internal supplier master list for sourcing and costing." },
      { property: "og:title", content: "Suppliers | Vibrand Admin" },
      { property: "og:description", content: "Manage the supplier master list." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSuppliers,
});

type CellKey =
  | "name"
  | "code"
  | "country"
  | "default_shipping_mode"
  | "unit_system"
  | "contact"
  | "notes";

const HEAD = "px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";
const CELL = "px-3 py-0 align-middle";

function AdminSuppliers() {
  const queryClient = useQueryClient();
  const suppliers = useQuery(suppliersQuery);
  const sourcing = useQuery(productSourcingQuery);
  const [editing, setEditing] = useState<{ id: string; key: CellKey } | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of sourcing.data ?? []) {
      if (!row.supplier_id) continue;
      map.set(row.supplier_id, (map.get(row.supplier_id) ?? 0) + 1);
    }
    return map;
  }, [sourcing.data]);

  const rows = (suppliers.data ?? []).filter((s) => showArchived || !s.is_archived);
  const archivedCount = (suppliers.data ?? []).filter((s) => s.is_archived).length;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["product_sourcing"] }),
    ]);

  async function patch(id: string, values: Partial<Supplier>) {
    const { error } = await supabase.from("suppliers").update(values).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    await refresh();
    return true;
  }

  function startEdit(supplier: Supplier, key: CellKey) {
    setEditing({ id: supplier.id, key });
    setDraft(String(supplier[key] ?? ""));
  }

  async function commit(supplier: Supplier, key: CellKey) {
    const value = key === "code" ? draft.trim().toUpperCase() : draft.trim();
    setEditing(null);
    if (value === String(supplier[key] ?? "")) return;
    if (key === "name" && !value) {
      toast.error("The supplier name is required.");
      return;
    }
    if (key === "code") {
      const problem = supplierCodeProblem(value);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    await patch(supplier.id, { [key]: value } as Partial<Supplier>);
  }

  async function addSupplier() {
    const problem = supplierCodeProblem(newCode);
    if (!newName.trim()) {
      toast.error("Enter the supplier name.");
      return;
    }
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("suppliers").insert({
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      country: newCountry.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    setNewName("");
    setNewCode("");
    setNewCountry("");
    setAdding(false);
    toast.success("Supplier added.");
  }

  async function removeOrArchive(supplier: Supplier) {
    const used = counts.get(supplier.id) ?? 0;
    if (used > 0) {
      await patch(supplier.id, { is_archived: true });
      toast.success(
        `${supplier.code} is used by ${used} product${used === 1 ? "" : "s"}, so it was archived instead of deleted.`,
      );
      return;
    }
    const { error } = await supabase.from("suppliers").delete().eq("id", supplier.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Supplier removed.");
  }

  function editableCell(supplier: Supplier, key: CellKey, className = "") {
    const active = editing?.id === supplier.id && editing.key === key;
    if (active) {
      return (
        <td className={`${CELL} ${className}`}>
          <Input
            autoFocus
            value={draft}
            className="h-8 rounded-md text-[13px]"
            maxLength={key === "code" ? 3 : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commit(supplier, key)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void commit(supplier, key);
              if (event.key === "Escape") setEditing(null);
            }}
          />
        </td>
      );
    }
    const text = String(supplier[key] ?? "");
    return (
      <td
        className={`${CELL} cursor-text ${className}`}
        onClick={() => startEdit(supplier, key)}
        title="Click to edit"
      >
        <span className={text ? "" : "text-muted-foreground"}>{text || "—"}</span>
      </td>
    );
  }

  function choiceCell(supplier: Supplier, key: "default_shipping_mode" | "unit_system") {
    const options = key === "default_shipping_mode" ? SHIPPING_MODES : UNIT_SYSTEMS;
    return (
      <td className={CELL}>
        <select
          value={String(supplier[key])}
          onChange={(event) => void patch(supplier.id, { [key]: event.target.value })}
          className="h-8 rounded-md border border-n-200 bg-white px-1.5 text-[13px] capitalize"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </td>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal master list. Click any cell to edit it. Nothing here is visible on the customer
            site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {archivedCount ? (
            <Button variant="outline" size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> New supplier
          </Button>
        </div>
      </div>

      {suppliers.isLoading ? (
        <Skeleton className="mt-6 h-64 rounded-2xl" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="border-b border-border bg-secondary/60">
              <tr>
                <th className={HEAD}>Name</th>
                <th className={`${HEAD} w-20`}>Code</th>
                <th className={`${HEAD} w-40`}>Country</th>
                <th className={`${HEAD} w-28`}>Shipping</th>
                <th className={`${HEAD} w-28`}>Units</th>
                <th className={`${HEAD} w-40`}>Contact</th>
                <th className={HEAD}>Notes</th>
                <th className={`${HEAD} w-24 text-right`}>Products</th>
                <th className={`${HEAD} w-24 text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adding ? (
                <tr className="border-b border-border bg-lime-500/10">
                  <td className={CELL}>
                    <Input
                      autoFocus
                      value={newName}
                      placeholder="Supplier name"
                      className="h-8 rounded-md text-[13px]"
                      onChange={(event) => setNewName(event.target.value)}
                    />
                  </td>
                  <td className={CELL}>
                    <Input
                      value={newCode}
                      placeholder="ABC"
                      maxLength={3}
                      className="h-8 rounded-md text-[13px] uppercase"
                      onChange={(event) => setNewCode(event.target.value.toUpperCase())}
                    />
                  </td>
                  <td className={CELL}>
                    <Input
                      value={newCountry}
                      placeholder="Country"
                      className="h-8 rounded-md text-[13px]"
                      onChange={(event) => setNewCountry(event.target.value)}
                    />
                  </td>
                  <td className={`${CELL} text-muted-foreground`} colSpan={5}>
                    Shipping, units, contact and notes can be set once the row is added.
                  </td>
                  <td className={`${CELL} text-right`}>
                    <div className="flex justify-end gap-1 py-1.5">
                      <Button size="sm" disabled={saving} onClick={() => void addSupplier()}>
                        {saving ? "…" : "Add"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : null}

              {rows.map((supplier) => {
                const used = counts.get(supplier.id) ?? 0;
                return (
                  <tr
                    key={supplier.id}
                    className={`h-12 border-b border-border transition-colors hover:bg-secondary/50 ${
                      supplier.is_archived ? "opacity-60" : ""
                    }`}
                  >
                    {editableCell(supplier, "name", "font-medium")}
                    {editableCell(supplier, "code", "font-mono")}
                    {editableCell(supplier, "country")}
                    {choiceCell(supplier, "default_shipping_mode")}
                    {choiceCell(supplier, "unit_system")}
                    {editableCell(supplier, "contact")}
                    {editableCell(supplier, "notes", "text-muted-foreground")}
                    <td className={`${CELL} text-right tabular-nums`}>{used}</td>
                    <td className={`${CELL} text-right`}>
                      <div className="flex justify-end gap-1">
                        {supplier.is_archived ? (
                          <button
                            type="button"
                            aria-label="Restore supplier"
                            title="Restore"
                            onClick={() => void patch(supplier.id, { is_archived: false })}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <ArchiveRestore className="size-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Archive supplier"
                            title="Archive"
                            onClick={() => void patch(supplier.id, { is_archived: true })}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Archive className="size-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Remove supplier"
                          title={used ? "In use — will be archived" : "Remove"}
                          onClick={() => void removeOrArchive(supplier)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!rows.length && !adding ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                    No suppliers yet. Add your first one to start assigning products.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        A supplier that is assigned to products is archived instead of deleted, so past sourcing
        records stay intact.
      </p>
    </div>
  );
}