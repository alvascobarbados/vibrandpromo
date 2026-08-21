import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";

import { ProposalDocument } from "@/components/sales/ProposalDocument";
import { printProposal } from "@/lib/proposal-print";
import { validUntilLabel } from "@/lib/proposal-settings-defaults";
import { getProposalByToken } from "@/lib/proposals.functions";
import { useStaffSession } from "@/lib/staff-session";

/**
 * The customer-facing static proposal. No auth, no pricing engine — every
 * number here comes from the frozen snapshot written at generation.
 */
export const Route = createFileRoute("/p/$token")({
  loader: async ({ params }) => {
    // Bad/short tokens fail validation — a client sees the same "not found".
    const proposal = await getProposalByToken({ data: { token: params.token } }).catch(() => null);
    if (!proposal) throw notFound();
    return proposal;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Proposal unavailable" }, { name: "robots", content: "noindex, nofollow" }],
      };
    }
    const title = `${loaderData.clientName} — ${loaderData.projectName} | Vibrand Proposal`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Vibrand proposal for ${loaderData.clientName}: ${loaderData.projectName}.`,
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: `Vibrand proposal for ${loaderData.clientName}: ${loaderData.projectName}.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  notFoundComponent: SharedNotFound,
  component: SharedProposalPage,
});

function SharedNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-n-50 px-6">
      <div className="max-w-md rounded-2xl border border-n-200 bg-white px-8 py-10 text-center">
        <p className="font-display text-[22px] font-extrabold tracking-tight text-navy-900">
          vibrand<span className="text-lime-500">.</span>
        </p>
        <h1 className="mt-4 text-lg font-bold text-navy-900">This proposal isn’t available</h1>
        <p className="mt-2 text-sm text-n-600">
          The link may have expired or been mistyped. Please contact your Vibrand representative for
          an up-to-date copy.
        </p>
      </div>
    </div>
  );
}

function SharedProposalPage() {
  const data = Route.useLoaderData();
  const { isStaff } = useStaffSession();
  const validity = validUntilLabel(data.generatedAt, data.settings.validityDays);

  const print = () =>
    printProposal({
      template: data.settings.filenameTemplate,
      client: data.clientName,
      project: data.projectName,
      dateISO: data.generatedAt,
    });

  // ?print=1 opens straight into the browser's print dialog (list-page PDF action).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("print")) return;
    const timer = window.setTimeout(print, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-n-50">
      <div className="proposal-no-print sticky top-0 z-30 border-b border-n-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[848px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="font-display text-[18px] font-extrabold tracking-tight text-navy-900">
            vibrand<span className="text-lime-500">.</span>
          </p>
          <div className="flex items-center gap-3">
            {isStaff ? (
              <Link
                to="/sales/proposals/$id"
                params={{ id: data.proposalId }}
                className="text-[11.5px] font-semibold text-n-500 hover:text-navy-900"
              >
                Open in editor
              </Link>
            ) : null}
            {data.settings.clientCanExport ? (
              <button
                type="button"
                onClick={print}
                className="inline-flex h-9 items-center rounded-full bg-lime-500 px-4 text-[12px] font-bold text-navy-900 hover:bg-lime-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900"
              >
                Export as PDF
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[848px] px-4 py-8">
        <div className="overflow-hidden rounded-[20px] border border-n-200 bg-white shadow-[0_10px_30px_-18px_rgba(20,30,50,0.25)]">
          <ProposalDocument
            readOnly
            itemsPerPage={data.settings.itemsPerPage}
            header={{
              clientName: data.clientName,
              buyerName: data.buyerName,
              projectName: data.projectName,
              status: "generated",
              incoterm: data.incoterm,
              currency: data.currency,
              dateISO: data.generatedAt,
              preparedBy: data.preparedBy,
              itemCount: data.items.length,
            }}
            items={data.items}
            footerNote={
              <>
                {validity ? `${validity} · ` : ""}
                {data.settings.footerText}
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
