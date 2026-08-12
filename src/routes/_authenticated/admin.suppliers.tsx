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
  createOrigin,
  normalizeOriginCode,
  originCodeProblem,
  originsQuery,
  productSourcingQuery,
  supplierCodeProblem,
  suppliersQuery,
  type Origin,
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

type CellKey = "name" | "code" | "default_shipping_mode" | "unit_system" | "contact" | "notes";
type OriginCellKey = "code" | "name" | "notes";

const HEAD = "px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";
const CELL = "px-3 py-0 align-middle";
const SELECT_CLASS =
  "h-8 w-full rounded-md border border-n-200 bg-white px-1.5 text-[13px] capitalize";

function AdminSuppliers() {
  const [tab, setTab] = useState<"suppliers" | "origins">("suppliers");

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Sourcing master data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal lists only. Click any cell to edit it. Nothing here is visible on the customer
          site.
        </p>
      </div>

      <div className="mt-4 flex gap-1 border-b border-border">
        {(["suppliers", "origins"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold capitalize transition-colors ${
              tab === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {tab === "suppliers" ? <SuppliersTab /> : <OriginsTab />}
    </div>
  );
}

function SuppliersTab() {
  const queryClient = useQueryClient();
  const suppliers = useQuery(suppliersQuery);
  const sourcing = useQuery(productSourcingQuery);
  const origins = useQuery(originsQuery);
  const [editing, setEditing] = useState<{ id: string; key: CellKey } | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newOriginId, setNewOriginId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [originFor, setOriginFor] = useState<string | null>(null);
  const [quickCode, setQuickCode] = useState("");
  const [quickName, setQuickName] = useState("");
  const [creatingOrigin, setCreatingOrigin] = useState(false);

  const originList = origins.data ?? [];
  const originById = useMemo(
    () => new Map(originList.map((origin) => [origin.id, origin])),
    [originList],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of sourcing.data ?? []) {
      if (!row.supplier_id) continue;
      map.set(row.supplier_id, (map.get(row.supplier_id) ?? 0) + 1);
    }
    return map;
  }, [sourcing.data]);

  const term = search.trim().toLowerCase();
  const rows = (suppliers.data ?? [])
    .filter((s) => showArchived || !s.is_archived)
    .filter((s) => {
      if (!term) return true;
      const origin = s.origin_id ? originById.get(s.origin_id)?.name ?? "" : "";
      return `${s.name} ${s.code} ${origin} ${s.contact ?? ""} ${s.notes}`
        .toLowerCase()
        .includes(term);
    });
  const archivedCount = (suppliers.data ?? []).filter((s) => s.is_archived).length;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["product_sourcing"] }),
    ]);

  async function patch(id: string, values: Record<string, unknown>) {
    const { error } = await supabase.from("suppliers").update(values as never).eq("id", id);
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
    await patch(supplier.id, { [key]: value });
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
      origin_id: newOriginId || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    setNewName("");
    setNewCode("");
    setNewOriginId("");
    setAdding(false);
    toast.success("Supplier added.");
  }

  async function quickCreateOrigin() {
    const problem = originCodeProblem(quickCode);
    if (!quickName.trim()) {
      toast.error("Enter the origin name.");
      return;
    }
    if (problem) {
      toast.error(problem);
      return;
    }
    setCreatingOrigin(true);
    try {
      const origin = await createOrigin({ code: quickCode, name: quickName });
      await queryClient.invalidateQueries({ queryKey: ["origins"] });
      if (originFor === "__new") setNewOriginId(origin.id);
      else if (originFor) await patch(originFor, { origin_id: origin.id });
      setOriginFor(null);
      setQuickCode("");
      setQuickName("");
      toast.success(`${origin.name} added to origins.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the origin.");
    } finally {
      setCreatingOrigin(false);
    }
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
          className={SELECT_CLASS}
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

  function originSelect(value: string, onPick: (originId: string) => void, forKey: string) {
    return (
      <select
        value={value}
        onChange={(event) => {
          if (event.target.value === "__add") {
            setOriginFor(forKey);
            return;
          }
          onPick(event.target.value);
        }}
        className={`${SELECT_CLASS} normal-case`}
      >
        <option value="">No origin</option>
        {originList.map((origin) => (
          <option key={origin.id} value={origin.id}>
            {origin.name}
          </option>
        ))}
        <option value="__add">+ Add new origin</option>
      </select>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Input
          value={search}
          placeholder="Search name, code, origin…"
          className="h-9 w-full max-w-xs rounded-md text-[13px]"
          onChange={(event) => setSearch(event.target.value)}
        />
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

      {originFor ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-secondary/50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              New origin code
            </p>
            <Input
              autoFocus
              value={quickCode}
              placeholder="USA_MIAMI"
              className="mt-1 h-8 w-40 rounded-md text-[13px] uppercase"
              onChange={(event) => setQuickCode(normalizeOriginCode(event.target.value))}
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Name
            </p>
            <Input
              value={quickName}
              placeholder="USA (Miami)"
              className="mt-1 h-8 w-56 rounded-md text-[13px]"
              onChange={(event) => setQuickName(event.target.value)}
            />
          </div>
          <Button size="sm" disabled={creatingOrigin} onClick={() => void quickCreateOrigin()}>
            {creatingOrigin ? "Adding…" : "Add origin"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOriginFor(null)}>
            Cancel
          </Button>
        </div>
      ) : null}

      {suppliers.isLoading ? (
        <Skeleton className="mt-6 h-64 rounded-2xl" />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="border-b border-border bg-secondary/60">
              <tr>
                <th className={HEAD}>Name</th>
                <th className={`${HEAD} w-20`}>Code</th>
                <th className={`${HEAD} w-44`}>Origin</th>
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
                    {originSelect(newOriginId, (id) => setNewOriginId(id), "__new")}
                  </td>
                  <td className={`${CELL} text-muted-foreground`} colSpan={4}>
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
                    <td className={CELL}>
                      {originSelect(
                        supplier.origin_id ?? "",
                        (id) => void patch(supplier.id, { origin_id: id || null }),
                        supplier.id,
                      )}
                    </td>
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
                    No suppliers found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {rows.length} supplier{rows.length === 1 ? "" : "s"} shown. A supplier that is assigned to
        products is archived instead of deleted, so past sourcing records stay intact.
      </p>
    </>
  );
}

function OriginsTab() {
  const queryClient = useQueryClient();
  const origins = useQuery(originsQuery);
  const suppliers = useQuery(suppliersQuery);
  const [editing, setEditing] = useState<{ id: string; key: OriginCellKey } | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const supplier of suppliers.data ?? []) {
      if (!supplier.origin_id) continue;
      map.set(supplier.origin_id, (map.get(supplier.origin_id) ?? 0) + 1);
    }
    return map;
  }, [suppliers.data]);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["origins"] }),
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
    ]);

  async function patch(id: string, values: Record<string, unknown>) {
    const { error } = await supabase.from("origins").update(values as never).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
  }

  async function commit(origin: Origin, key: OriginCellKey) {
    const value = key === "code" ? normalizeOriginCode(draft) : draft.trim();
    setEditing(null);
    if (value === String(origin[key] ?? "")) return;
    if (key === "name" && !value) {
      toast.error("The origin name is required.");
      return;
    }
    if (key === "code") {
      const problem = originCodeProblem(value);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    await patch(origin.id, { [key]: value });
  }

  async function addOrigin() {
    const problem = originCodeProblem(newCode);
    if (!newName.trim()) {
      toast.error("Enter the origin name.");
      return;
    }
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      await createOrigin({ code: newCode, name: newName });
      await refresh();
      setNewCode("");
      setNewName("");
      setAdding(false);
      toast.success("Origin added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the origin.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(origin: Origin) {
    if ((counts.get(origin.id) ?? 0) > 0) {
      toast.error("This origin is assigned to suppliers. Move them first.");
      return;
    }
    const { error } = await supabase.from("origins").delete().eq("id", origin.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Origin removed.");
  }

  function cell(origin: Origin, key: OriginCellKey, className = "") {
    const active = editing?.id === origin.id && editing.key === key;
    if (active) {
      return (
        <td className={`${CELL} ${className}`}>
          <Input
            autoFocus
            value={draft}
            className="h-8 rounded-md text-[13px]"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commit(origin, key)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void commit(origin, key);
              if (event.key === "Escape") setEditing(null);
            }}
          />
        </td>
      );
    }
    const text = String(origin[key] ?? "");
    return (
      <td
        className={`${CELL} cursor-text ${className}`}
        onClick={() => {
          setEditing({ id: origin.id, key });
          setDraft(text);
        }}
        title="Click to edit"
      >
        <span className={text ? "" : "text-muted-foreground"}>{text || "—"}</span>
      </td>
    );
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Where goods ship from. Suppliers pick one of these.
        </p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> New origin
        </Button>
      </div>

      {origins.isLoading ? (
        <Skeleton className="mt-4 h-64 rounded-2xl" />
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[700px] text-left text-[13px]">
            <thead className="border-b border-border bg-secondary/60">
              <tr>
                <th className={`${HEAD} w-48`}>Code</th>
                <th className={`${HEAD} w-56`}>Name</th>
                <th className={HEAD}>Notes</th>
                <th className={`${HEAD} w-28 text-right`}>Suppliers</th>
                <th className={`${HEAD} w-20 text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adding ? (
                <tr className="border-b border-border bg-lime-500/10">
                  <td className={CELL}>
                    <Input
                      autoFocus
                      value={newCode}
                      placeholder="USA_MIAMI"
                      className="h-8 rounded-md text-[13px] uppercase"
                      onChange={(event) => setNewCode(normalizeOriginCode(event.target.value))}
                    />
                  </td>
                  <td className={CELL}>
                    <Input
                      value={newName}
                      placeholder="USA (Miami)"
                      className="h-8 rounded-md text-[13px]"
                      onChange={(event) => setNewName(event.target.value)}
                    />
                  </td>
                  <td className={`${CELL} text-muted-foreground`} colSpan={2}>
                    Notes can be added once the row exists.
                  </td>
                  <td className={`${CELL} text-right`}>
                    <div className="flex justify-end gap-1 py-1.5">
                      <Button size="sm" disabled={saving} onClick={() => void addOrigin()}>
                        {saving ? "…" : "Add"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : null}

              {(origins.data ?? []).map((origin) => (
                <tr
                  key={origin.id}
                  className="h-12 border-b border-border transition-colors hover:bg-secondary/50"
                >
                  {cell(origin, "code", "font-mono")}
                  {cell(origin, "name", "font-medium")}
                  {cell(origin, "notes", "text-muted-foreground")}
                  <td className={`${CELL} text-right tabular-nums`}>{counts.get(origin.id) ?? 0}</td>
                  <td className={`${CELL} text-right`}>
                    <button
                      type="button"
                      aria-label="Remove origin"
                      title="Remove"
                      onClick={() => void remove(origin)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
