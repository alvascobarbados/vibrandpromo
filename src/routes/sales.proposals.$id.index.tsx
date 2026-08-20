import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/SiteLayout";
import { ProposalEditorPage } from "@/components/sales/ProposalEditorPage";

export const Route = createFileRoute("/sales/proposals/$id/")({
  head: () => ({
    meta: [
      { title: "Proposal Editor | Vibrand Staff" },
      { name: "description", content: "Build a Vibrand client proposal and generate a share link." },
      { property: "og:title", content: "Proposal Editor | Vibrand Staff" },
      { property: "og:description", content: "Staff editor for Vibrand client proposals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorRoute,
});

function EditorRoute() {
  const { id } = Route.useParams();
  return (
    <SiteLayout viewMode="supplier" headerSlot={<div />}>
      <ProposalEditorPage proposalId={id} />
    </SiteLayout>
  );
}