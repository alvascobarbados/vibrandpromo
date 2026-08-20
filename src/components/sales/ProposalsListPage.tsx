import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NewProposalDialog } from "@/components/sales/NewProposalDialog";
import { proposalsQuery, relativeTime, type ProposalListRow } from "@/lib/proposals";

const STATUS_CHIPS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "generated", label: "Generated" },
] as const;

export function shareUrl(token: string) {
  return `${window.location.origin}/p/${token}`;
}

function StatusTag({ row }: { row: ProposalListRow }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
          row.status === "generated"
            ? "bg-lime-50 text-navy-900 ring-1 ring-lime-500"
            : "bg-n-100 text-n-600"
        }`}
      >
        {row.status === "generated" ? "Generated" : "Draft"}
      </span>
      {row.edited_since_generated ? (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700 ring-1 ring-amber-400">
          Edited since
        </span>
      ) : null}
    </span>
  );
}

export function ProposalsListPage() {
  const proposals = useQuery(proposalsQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "generated">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (proposals.data ?? []).filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return (
        row.client_name.toLowerCase().includes(needle) ||
        row.project_name.toLowerCase().includes(needle)
      );
    });
  }, [proposals.data, search, status]);

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      toast.success("Share link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  const pill =
    "inline-flex h-8 items-center rounded-full border border-n-200 px-3 text-[12px] font-semibold text-navy-700 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500";

  return (
    <div className="site-container py-8">
      <div className="overflow-hidden rounded-2xl border border-n-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          <h1 className="text-2xl font-bold text-navy-900">Proposals</h1>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search client or project"
              aria-label="Search proposals by client or project"
              className="h-10 w-56 rounded-full"
            />
            <Link
              to="/sales/clients"
              className="inline-flex h-10 items-center rounded-full border border-n-200 px-4 text-[12px] font-semibold text-navy-700 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              Clients
            </Link>
            <Button
              className="h-10 rounded-full bg-navy-900 text-white hover:bg-navy-800"
              onClick={() => setDialogOpen(true)}
            >
              + New proposal
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-4">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatus(chip.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 ${
                status === chip.value
                  ? "bg-navy-900 text-white"
                  : "bg-n-100 text-n-700 hover:bg-navy-50"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {proposals.isLoading ? (
          <div className="space-y-2 border-t border-n-200 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="border-t border-n-200 py-16 text-center text-sm text-muted-foreground">
            No proposals yet. Create one to get started.
          </p>
        ) : (
          <ul className="divide-y divide-n-200 border-t border-n-200">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy-900">{row.client_name}</p>
                  <p className="truncate text-sm text-n-700">{row.project_name}</p>
                  <p className="mt-1 text-[11px] text-n-600">
                    {row.incoterm} · {row.item_count} item{row.item_count === 1 ? "" : "s"} ·
                    updated {relativeTime(row.updated_at)} · by {row.created_by_name}
                  </p>
                </div>
                <StatusTag row={row} />
                <div className="flex items-center gap-2">
                  <Link to="/sales/proposals/$id" params={{ id: row.id }} className={pill}>
                    Open
                  </Link>
                  {row.status === "generated" && row.share_token ? (
                    <>
                      <button
                        type="button"
                        className={pill}
                        onClick={() => void copyLink(row.share_token as string)}
                      >
                        Copy link
                      </button>
                      <button
                        type="button"
                        className={pill}
                        onClick={() =>
                          window.open(`/p/${row.share_token}?print=1`, "_blank", "noopener")
                        }
                      >
                        PDF
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>


      <NewProposalDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}