/**
 * Proposal presentation settings: the shape, the defaults and the pure
 * formatters. Dependency-free so the server (freeze / share fn) and the browser
 * (admin tab, print) share one contract.
 *
 * The defaults are the contract: every surface falls back to them when the row
 * is missing, so the document never depends on the settings row existing.
 */
export type ProposalSettingsRow = {
  filename_template: string;
  items_per_page: number;
  footer_text: string;
  validity_days: number;
  client_can_export: boolean;
  number_prefix: string;
  public_base_url: string | null;
};

export const PROPOSAL_SETTINGS_FALLBACK: ProposalSettingsRow = {
  filename_template: "Vibrand Proposal - {number} - {client} - {project} - {date}",
  items_per_page: 2,
  footer_text: "Vibrand · Bridgetown, Barbados · sales@vibrand.com",
  validity_days: 30,
  client_can_export: true,
  number_prefix: "VP",
  public_base_url: null,
};

export const ITEMS_PER_PAGE_CHOICES = [2, 3, 4] as const;

/** {number} {client} {project} {date} → the saved PDF's suggested filename. */
export function proposalFilename(
  template: string,
  parts: { client: string; project: string; dateISO: string | null; number?: string | null },
) {
  const date = parts.dateISO
    ? new Date(parts.dateISO).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return (template || PROPOSAL_SETTINGS_FALLBACK.filename_template)
    .replaceAll("{number}", parts.number ?? "")
    .replaceAll("{client}", parts.client)
    .replaceAll("{project}", parts.project)
    .replaceAll("{date}", date)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Valid until 20 Sep 2026" from generated_at + validity_days. */
export function validUntilLabel(generatedAt: string | null, days: number) {
  if (!generatedAt) return null;
  const until = new Date(new Date(generatedAt).getTime() + days * 86_400_000);
  return `Valid until ${until.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}
