import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const settingsSchema = z.object({
  staff_notify_enabled: z.boolean(),
  customer_confirm_enabled: z.boolean(),
  recipients: z.array(z.string().trim().email().max(255)).max(25),
  reply_to: z.string().trim().email().max(255),
  from_name: z.string().trim().min(1).max(60),
});

const copySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  heading: z.string().trim().min(1).max(160),
  body: z.string().max(4000),
  signoff: z.string().max(2000),
});

const templateTypeSchema = z.enum(["staff", "customer"]);

export const updateEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Forbidden: admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: writeError } = await supabaseAdmin
      .from("email_settings")
      .upsert({ id: "default", ...data }, { onConflict: "id" });
    if (writeError) throw new Error(writeError.message);
    return { ok: true as const };
  });

export const getEmailStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden: admin access required");

    const { getDomainStatus, PREFERRED_FROM, TEST_FROM, SEND_DOMAIN } = await import(
      "@/lib/email.server"
    );
    const status = await getDomainStatus();
    console.log("[email] domain status check", status);
    return {
      apiKeyConfigured: Boolean(process.env["RESEND_API_KEY"]),
      domainVerified: status.verified,
      domainState: status.state,
      domainDetail: status.detail ?? null,
      sendDomain: SEND_DOMAIN,
      fromAddress: status.verified ? PREFERRED_FROM : TEST_FROM,
    };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        template: templateTypeSchema,
        to: z.string().trim().email().max(255),
        draft: copySchema.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden: admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      SAMPLE_QUOTE,
      isDomainVerified,
      loadEmailSettings,
      loadTemplate,
      findUnknownTags,
      renderEmail,
      sendAndLog,
    } = await import("@/lib/email.server");

    const copy = data.draft ?? (await loadTemplate(supabaseAdmin, data.template));
    const unknown = findUnknownTags(copy);
    if (unknown.length) throw new Error(`Unknown merge tags: ${unknown.join(", ")}`);

    const settings = await loadEmailSettings(supabaseAdmin);
    const verified = await isDomainVerified();
    const built = renderEmail(data.template, copy, SAMPLE_QUOTE);

    const result = await sendAndLog(supabaseAdmin, {
      type: data.template === "staff" ? "test_staff" : "test_customer",
      to: data.to,
      ...built,
      subject: `[TEST] ${built.subject}`,
      fromName: settings.from_name,
      replyTo: settings.reply_to,
      verified,
    });

    return result;
  });

/** Renders the draft copy with sample data using the production renderer. */
export const previewEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ template: templateTypeSchema, draft: copySchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden: admin access required");

    const { SAMPLE_QUOTE, findUnknownTags, renderEmail } = await import("@/lib/email.server");
    const unknownTags = findUnknownTags(data.draft);
    const built = renderEmail(data.template, data.draft, SAMPLE_QUOTE);
    return { subject: built.subject, html: built.html, unknownTags };
  });

export const saveEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ template: templateTypeSchema, draft: copySchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Forbidden: admin access required");

    const { findUnknownTags, MERGE_TAGS } = await import("@/lib/email.server");
    const unknown = findUnknownTags(data.draft);
    if (unknown.length) {
      // Expected user-input problem — return it as data so it surfaces as a toast,
      // not as an uncaught server-function error.
      return {
        ok: false as const,
        error: `These merge tags aren't recognised: ${unknown
          .map((tag) => `{{${tag}}}`)
          .join(", ")}. Valid tags are ${MERGE_TAGS.map((tag) => `{{${tag}}}`).join(", ")}.`,
      };
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: writeError } = await supabaseAdmin.from("email_templates").upsert(
      {
        template_type: data.template,
        ...data.draft,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
        updated_by_name: profile?.display_name || profile?.email || "",
      },
      { onConflict: "template_type" },
    );
    if (writeError) throw new Error(writeError.message);
    return { ok: true as const };
  });

export const resetEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ template: templateTypeSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden: admin access required");

    const { DEFAULT_TEMPLATES } = await import("@/lib/email.server");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("email_templates").upsert(
      {
        template_type: data.template,
        ...DEFAULT_TEMPLATES[data.template],
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
        updated_by_name: profile?.display_name || profile?.email || "",
      },
      { onConflict: "template_type" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, draft: DEFAULT_TEMPLATES[data.template] };
  });