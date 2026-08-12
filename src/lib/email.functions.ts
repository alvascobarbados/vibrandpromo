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
        template: z.enum(["staff", "customer"]),
        to: z.string().trim().email().max(255),
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
      customerTemplate,
      isDomainVerified,
      loadEmailSettings,
      sendAndLog,
      staffTemplate,
    } = await import("@/lib/email.server");

    const settings = await loadEmailSettings(supabaseAdmin);
    const verified = await isDomainVerified();
    const built =
      data.template === "staff" ? staffTemplate(SAMPLE_QUOTE) : customerTemplate(SAMPLE_QUOTE);

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