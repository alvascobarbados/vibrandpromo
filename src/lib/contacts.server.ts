import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

/** Keeps the mailing list in sync with every quote submission. Never throws. */
export async function upsertContact(
  supabaseAdmin: SupabaseClient<Database>,
  input: {
    email: string;
    name: string;
    company: string;
    phone: string | null;
    territory: string;
    marketing_opt_in: boolean;
  },
) {
  try {
    const email = input.email.trim().toLowerCase();
    const { data: existing } = await supabaseAdmin
      .from("contacts")
      .select("id, request_count, marketing_opt_in")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("contacts")
        .update({
          name: input.name,
          company: input.company,
          phone: input.phone,
          territory: input.territory,
          marketing_opt_in: input.marketing_opt_in || existing.marketing_opt_in,
          last_request_at: new Date().toISOString(),
          request_count: existing.request_count + 1,
        })
        .eq("id", existing.id);
      return;
    }

    await supabaseAdmin.from("contacts").insert({
      email,
      name: input.name,
      company: input.company,
      phone: input.phone,
      territory: input.territory,
      marketing_opt_in: input.marketing_opt_in,
    });
  } catch (error) {
    console.error("[contacts] failed to record contact", error);
  }
}