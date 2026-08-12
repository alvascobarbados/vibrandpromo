import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Download } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contactsQuery, type ContactRow } from "@/lib/email-settings";

export const Route = createFileRoute("/_authenticated/admin/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts | Vibrand Admin" },
      {
        name: "description",
        content: "Every customer who has requested a quote, with marketing opt-in and CSV export.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContactsPage,
});

type SortKey = "last_request_at" | "first_request_at" | "name" | "company" | "request_count";

const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: null, label: "Email" },
  { key: null, label: "Phone" },
  { key: null, label: "Territory" },
  { key: null, label: "Opt-in" },
  { key: "first_request_at", label: "First request" },
  { key: "last_request_at", label: "Last request" },
  { key: "request_count", label: "Requests" },
];

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function ContactsPage() {
  const contacts = useQuery(contactsQuery);
  const [search, setSearch] = useState("");
  const [optIn, setOptIn] = useState("all");
  const [sort, setSort] = useState<SortKey>("last_request_at");
  const [ascending, setAscending] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = (contacts.data ?? []).filter((row) => {
      if (optIn === "yes" && !row.marketing_opt_in) return false;
      if (optIn === "no" && row.marketing_opt_in) return false;
      if (!term) return true;
      return `${row.name} ${row.company} ${row.email} ${row.territory}`
        .toLowerCase()
        .includes(term);
    });
    const sorted = [...filtered].sort((a, b) => {
      const left = a[sort];
      const right = b[sort];
      if (typeof left === "number" && typeof right === "number") return left - right;
      return String(left).localeCompare(String(right));
    });
    return ascending ? sorted : sorted.reverse();
  }, [contacts.data, search, optIn, sort, ascending]);

  function exportCsv() {
    const header = [
      "name",
      "company",
      "email",
      "phone",
      "territory",
      "marketing_opt_in",
      "first_request_at",
      "last_request_at",
      "request_count",
    ];
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.name,
          row.company,
          row.email,
          row.phone ?? "",
          row.territory,
          row.marketing_opt_in ? "yes" : "no",
          row.first_request_at,
          row.last_request_at,
          row.request_count,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vibrand-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: SortKey) {
    if (key === sort) setAscending((prev) => !prev);
    else {
      setSort(key);
      setAscending(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Contacts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Built automatically from quote requests — one row per email address.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Input
          className="sm:max-w-xs"
          value={search}
          placeholder="Search name, company, email…"
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={optIn} onValueChange={setOptIn}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contacts</SelectItem>
            <SelectItem value="yes">Opted in</SelectItem>
            <SelectItem value="no">Not opted in</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-2 size-4" /> Export CSV ({rows.length})
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-n-500">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.label} className="whitespace-nowrap px-3 py-2">
                  {column.key ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-n-900"
                      onClick={() => toggleSort(column.key as SortKey)}
                    >
                      {column.label}
                      <ArrowUpDown className="size-3" />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-muted-foreground">
                  {contacts.isLoading ? "Loading…" : "No contacts yet."}
                </td>
              </tr>
            ) : (
              rows.map((row: ContactRow) => (
                <tr key={row.id} className="border-t border-n-200">
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.company}</td>
                  <td className="px-3 py-2">{row.email}</td>
                  <td className="whitespace-nowrap px-3 py-2">{row.phone ?? "—"}</td>
                  <td className="px-3 py-2">{row.territory}</td>
                  <td className="px-3 py-2">
                    {row.marketing_opt_in ? (
                      <span className="rounded-full bg-lime-500 px-2 py-0.5 text-xs font-semibold text-n-700">
                        Yes
                      </span>
                    ) : (
                      <span className="text-n-500">No</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {new Date(row.first_request_at).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {new Date(row.last_request_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">{row.request_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}