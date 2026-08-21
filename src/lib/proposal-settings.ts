/**
 * Browser entry point for proposal settings. The shape, defaults and pure
 * formatters live in the dependency-free defaults module so the server can
 * reuse them verbatim.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  PROPOSAL_SETTINGS_FALLBACK,
  type ProposalSettingsRow,
} from "@/lib/proposal-settings-defaults";

export {
  PROPOSAL_SETTINGS_FALLBACK,
  ITEMS_PER_PAGE_CHOICES,
  proposalFilename,
  validUntilLabel,
} from "@/lib/proposal-settings-defaults";
export type { ProposalSettingsRow } from "@/lib/proposal-settings-defaults";

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
