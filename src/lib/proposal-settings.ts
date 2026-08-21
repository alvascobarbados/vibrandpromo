/**
 * Proposal presentation settings — one row, staff-read / admin-write.
 *
 * The defaults below are the contract: every surface (share page footer, print
 * pagination, PDF filename) falls back to them when the row is missing, so the
 * document never depends on the settings row existing.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type ProposalSettingsRow = {
  filename_template: string;
  items_per_page: number;
  footer_text: string;
  validity_days: number;
  client_can_export: boolean;
};

export const PROPOSAL_SETTINGS_FALLBACK: ProposalSettingsRow = {
  filename_template: "Vibrand Proposal - {client} - {project} - {date}",
  items_per_page: 2,
  footer_text: "Vibrand · Bridgetown, Barbados · sales@vibrand.com",
  validity_days: 30,
  client_can_export: true,
};

export const ITEMS_PER_PAGE_CHOICES = [2, 3, 4] as const;

export const proposalSettingsQuery = queryOptions({
  queryKey: ["admin", "proposal-settings"],
  queryFn: async (): Promise<ProposalSettingsRow> => {
    const { data, error } = await supabase
      .from("proposal_settings")
      .select("filename_template, items_per_page, footer_text, validity_days, client_can_export")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    return (data as ProposalSettingsRow | null) ?? PROPOSAL_SETTINGS_FALLBACK;
  },
});

/** {client} {project} {date} → the saved PDF's suggested filename. */
export function proposalFilename(
  template: string,
  parts: { client: string; project: string; dateISO: string | null },
) {
  const date = parts.dateISO
    ? new Date(parts.dateISO).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return (template || PROPOSAL_SETTINGS_FALLBACK.filename_template)
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
