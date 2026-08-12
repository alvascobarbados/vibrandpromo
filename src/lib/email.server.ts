/**
 * Server-only email layer: Resend transport, brand templates and logging.
 * Never import this from client code.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export const SEND_DOMAIN = "vibrand.com";
export const PREFERRED_FROM = `noreply@${SEND_DOMAIN}`;
/** Resend's shared sandbox sender — used until the domain verifies. */
export const TEST_FROM = "onboarding@resend.dev";

const CHARCOAL = "#54565A";
const LIME = "#BFD730";
const RESEND_URL = "https://api.resend.com";

export type EmailSettings = {
  staff_notify_enabled: boolean;
  customer_confirm_enabled: boolean;
  recipients: string[];
  reply_to: string;
  from_name: string;
};

export const DEFAULT_SETTINGS: EmailSettings = {
  staff_notify_enabled: true,
  customer_confirm_enabled: true,
  recipients: ["avaswani@alvas.co"],
  reply_to: "sales@vibrand.com",
  from_name: "Vibrand",
};

export type EmailItem = {
  sku: string | null;
  product_name: string;
  quantity: number;
  notes: string | null;
};

export type QuoteEmailPayload = {
  id: string;
  customer_name: string;
  company: string;
  email: string;
  phone: string | null;
  territory: string;
  message: string | null;
  items: EmailItem[];
};

type Admin = SupabaseClient<Database>;

export async function loadEmailSettings(supabaseAdmin: Admin): Promise<EmailSettings> {
  const { data } = await supabaseAdmin
    .from("email_settings")
    .select("staff_notify_enabled, customer_confirm_enabled, recipients, reply_to, from_name")
    .eq("id", "default")
    .maybeSingle();
  return data ? (data as EmailSettings) : DEFAULT_SETTINGS;
}

/** Resend reports the domain as verified once DNS propagates. */
export async function isDomainVerified(): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return false;
  try {
    const response = await fetch(`${RESEND_URL}/domains`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { data?: { name?: string; status?: string }[] };
    return (body.data ?? []).some(
      (domain) => domain.name === SEND_DOMAIN && domain.status === "verified",
    );
  } catch {
    return false;
  }
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:${CHARCOAL};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:${CHARCOAL};padding:18px 24px;">
      <span style="display:inline-block;background:${LIME};color:${CHARCOAL};font-weight:700;font-size:18px;padding:4px 10px;border-radius:6px;">v!</span>
      <span style="color:#ffffff;font-weight:700;font-size:16px;margin-left:10px;">vibrand.</span>
    </td></tr>
    <tr><td style="padding:24px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:${CHARCOAL};">${escapeHtml(title)}</h1>
      ${inner}
    </td></tr>
    <tr><td style="padding:18px 24px;border-top:4px solid ${LIME};font-size:12px;color:#8a8c90;">
      Vibrand Caribbean Inc. · sales@vibrand.com · +1 (246) 625-1000
    </td></tr>
  </table></body></html>`;
}

function itemRows(items: EmailItem[]) {
  return items
    .map(
      (item) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #e7e7e6;font-size:13px;">${escapeHtml(item.sku ?? "—")}</td>
      <td style="padding:8px;border-bottom:1px solid #e7e7e6;font-size:13px;">${escapeHtml(item.product_name)}</td>
      <td style="padding:8px;border-bottom:1px solid #e7e7e6;font-size:13px;text-align:right;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e7e7e6;font-size:13px;">${escapeHtml(item.notes ?? "")}</td>
    </tr>`,
    )
    .join("");
}

function itemsTable(items: EmailItem[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 20px;">
    <tr>
      <th align="left" style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#8a8c90;">SKU</th>
      <th align="left" style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#8a8c90;">Product</th>
      <th align="right" style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#8a8c90;">Qty</th>
      <th align="left" style="padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#8a8c90;">Notes</th>
    </tr>
    ${itemRows(items)}
  </table>`;
}

function itemsText(items: EmailItem[]) {
  return items
    .map(
      (item) =>
        `- ${item.sku ? `${item.sku} · ` : ""}${item.product_name} — qty ${item.quantity}${
          item.notes ? ` (${item.notes})` : ""
        }`,
    )
    .join("\n");
}

function field(label: string, value: string | null) {
  if (!value) return "";
  return `<p style="margin:0 0 6px;font-size:14px;"><strong>${label}:</strong> ${escapeHtml(value)}</p>`;
}

export function siteOrigin() {
  return process.env["PUBLIC_SITE_URL"] ?? "https://vibrandpromo.lovable.app";
}

export function staffTemplate(quote: QuoteEmailPayload) {
  const subject = `New quote request — ${quote.company} (${quote.items.length} item${
    quote.items.length === 1 ? "" : "s"
  })`;
  const link = `${siteOrigin()}/admin/quotes`;
  const html = shell(
    "New quote request",
    `${field("Name", quote.customer_name)}
     ${field("Company", quote.company)}
     ${field("Email", quote.email)}
     ${field("Phone", quote.phone)}
     ${field("Territory", quote.territory)}
     ${field("Message", quote.message)}
     <h2 style="font-size:15px;margin:20px 0 0;">Requested items</h2>
     ${itemsTable(quote.items)}
     <a href="${link}" style="display:inline-block;background:${LIME};color:${CHARCOAL};font-weight:700;text-decoration:none;padding:12px 20px;border-radius:999px;">Open in admin</a>`,
  );
  const text = `New quote request

Name: ${quote.customer_name}
Company: ${quote.company}
Email: ${quote.email}
Phone: ${quote.phone ?? "—"}
Territory: ${quote.territory}
Message: ${quote.message ?? "—"}

Items:
${itemsText(quote.items)}

Open in admin: ${link}`;
  return { subject, html, text };
}

export function customerTemplate(quote: QuoteEmailPayload) {
  const subject = "We've received your quote request — Vibrand";
  const html = shell(
    "Thanks — we've got your request",
    `<p style="font-size:14px;line-height:1.6;margin:0 0 14px;">Hi ${escapeHtml(
      quote.customer_name.split(" ")[0] || quote.customer_name,
    )},</p>
     <p style="font-size:14px;line-height:1.6;margin:0 0 14px;">Thank you for your quote request. Our team is reviewing it now and will get back to you with pricing, options and lead times <strong>within 24 hours</strong> (Monday to Friday).</p>
     <h2 style="font-size:15px;margin:20px 0 0;">What you asked us about</h2>
     ${itemsTable(quote.items)}
     <p style="font-size:14px;line-height:1.6;margin:0 0 4px;">If anything needs changing in the meantime, just reply to this email.</p>
     <p style="font-size:14px;line-height:1.6;margin:16px 0 0;">Warm regards,<br/><strong>Vibrand Caribbean Inc.</strong><br/>sales@vibrand.com · +1 (246) 625-1000</p>`,
  );
  const text = `Hi ${quote.customer_name},

Thank you for your quote request. Our team is reviewing it now and will get back to you with pricing, options and lead times within 24 hours (Monday to Friday).

What you asked us about:
${itemsText(quote.items)}

If anything needs changing in the meantime, just reply to this email.

Warm regards,
Vibrand Caribbean Inc.
sales@vibrand.com · +1 (246) 625-1000`;
  return { subject, html, text };
}

export const SAMPLE_QUOTE: QuoteEmailPayload = {
  id: "00000000-0000-0000-0000-000000000000",
  customer_name: "Test Customer",
  company: "Test Company Ltd.",
  email: "test@example.com",
  phone: "+1 (246) 000-0000",
  territory: "Barbados",
  message: "This is a test email from the Vibrand admin panel.",
  items: [
    { sku: "102006", product_name: "Sample Branded Tote", quantity: 250, notes: "1-colour logo" },
    { sku: "204118", product_name: "Sample Steel Bottle", quantity: 100, notes: null },
  ],
};

export type SendResult = { ok: boolean; error?: string };

/**
 * Sends one email through Resend and always records the attempt in email_log.
 * Never throws — callers treat email as best-effort.
 */
export async function sendAndLog(
  supabaseAdmin: Admin,
  args: {
    type: "staff_notification" | "customer_confirmation" | "test_staff" | "test_customer";
    to: string;
    subject: string;
    html: string;
    text: string;
    fromName: string;
    replyTo: string;
    verified: boolean;
    quoteRequestId?: string | null;
  },
): Promise<SendResult> {
  let ok = false;
  let error: string | undefined;

  try {
    const key = process.env["RESEND_API_KEY"];
    if (!key) throw new Error("RESEND_API_KEY is not configured");

    const from = `${args.fromName} <${args.verified ? PREFERRED_FROM : TEST_FROM}>`;
    const response = await fetch(`${RESEND_URL}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to: [args.to],
        reply_to: args.replyTo,
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend ${response.status}: ${body.slice(0, 500)}`);
    }
    ok = true;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    console.error(`[email] ${args.type} to ${args.to} failed:`, error);
  }

  try {
    await supabaseAdmin.from("email_log").insert({
      type: args.type,
      recipient: args.to,
      subject: args.subject,
      status: ok ? "sent" : "failed",
      error: error ?? null,
      quote_request_id: args.quoteRequestId ?? null,
    });
    // 90-day retention.
    await supabaseAdmin
      .from("email_log")
      .delete()
      .lt("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
  } catch (logError) {
    console.error("[email] failed to write email log", logError);
  }

  return ok ? { ok } : { ok, ...(error ? { error } : {}) };
}

/** Fires both quote emails. Swallows every failure by design. */
export async function sendQuoteEmails(supabaseAdmin: Admin, quote: QuoteEmailPayload) {
  try {
    const settings = await loadEmailSettings(supabaseAdmin);
    if (!settings.staff_notify_enabled && !settings.customer_confirm_enabled) return;
    const verified = await isDomainVerified();

    if (settings.staff_notify_enabled) {
      const staff = staffTemplate(quote);
      for (const recipient of settings.recipients) {
        await sendAndLog(supabaseAdmin, {
          type: "staff_notification",
          to: recipient,
          ...staff,
          fromName: settings.from_name,
          replyTo: settings.reply_to,
          verified,
          quoteRequestId: quote.id,
        });
      }
    }

    if (settings.customer_confirm_enabled) {
      const customer = customerTemplate(quote);
      await sendAndLog(supabaseAdmin, {
        type: "customer_confirmation",
        to: quote.email,
        ...customer,
        fromName: settings.from_name,
        replyTo: settings.reply_to,
        verified,
        quoteRequestId: quote.id,
      });
    }
  } catch (error) {
    console.error("[email] quote notification pipeline failed", error);
  }
}