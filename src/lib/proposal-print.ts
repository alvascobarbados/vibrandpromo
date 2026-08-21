/**
 * Export as PDF = the browser's own print pipeline against the print CSS
 * (@page Letter PORTRAIT). The only extra work is naming the file: Chrome and
 * Safari seed the PDF filename from document.title, so we swap it for the
 * settings template during the print call and restore it afterwards.
 */
import { proposalFilename } from "@/lib/proposal-settings-defaults";

export function printProposal(parts: {
  template: string;
  client: string;
  project: string;
  dateISO: string | null;
  number?: string | null;
}) {
  const previous = document.title;
  document.title = proposalFilename(parts.template, {
    client: parts.client,
    project: parts.project,
    dateISO: parts.dateISO,
    number: parts.number ?? null,
  });
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
  // Safari never fires afterprint reliably — restore on the next tick too.
  window.setTimeout(restore, 1500);
}
