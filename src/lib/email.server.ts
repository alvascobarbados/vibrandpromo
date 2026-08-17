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
  /** Optional customer deadline (ISO yyyy-mm-dd). */
  in_hand_date?: string | null;
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

export type DomainStatus = {
  /** Whether we send from the branded address. */
  verified: boolean;
  /** "verified" | "unverified" | "unreadable" (send-only key) | "no_key" */
  state: "verified" | "unverified" | "unreadable" | "no_key";
  detail?: string;
};

/**
 * Asks Resend for the domain record. A send-only ("restricted") API key cannot read
 * /domains and answers 401 restricted_api_key — that is NOT an unverified domain, so we
 * keep using the branded sender in that case.
 */
export async function getDomainStatus(): Promise<DomainStatus> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { verified: false, state: "no_key" };
  try {
    const response = await fetch(`${RESEND_URL}/domains`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = (await response.json().catch(() => null)) as
      | { data?: { name?: string; status?: string }[]; name?: string; message?: string }
      | null;

    if (!response.ok) {
      const reason = body?.name ?? `http_${response.status}`;
      if (response.status === 401 || response.status === 403) {
        // Send-only key: no read access to domains. Trust the configured sending domain.
        return {
          verified: true,
          state: "unreadable",
          detail: body?.message ?? "API key cannot read domain status",
        };
      }
      return { verified: false, state: "unverified", detail: reason };
    }

    const domains = body?.data ?? [];
    const match = domains.find(
      (domain) => domain.name === SEND_DOMAIN || domain.name?.endsWith(`.${SEND_DOMAIN}`),
    );
    if (!match) {
      return {
        verified: false,
        state: "unverified",
        detail: `${SEND_DOMAIN} is not on this Resend account`,
      };
    }
    const verified = match.status === "verified";
    return verified
      ? { verified: true, state: "verified" }
      : { verified: false, state: "unverified", detail: `status: ${match.status ?? "unknown"}` };
  } catch (error) {
    return {
      verified: false,
      state: "unverified",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Whether to send from the branded address. */
export async function isDomainVerified(): Promise<boolean> {
  return (await getDomainStatus()).verified;
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

/* ------------------------------------------------------------------ *
 * Editable template copy (plain text) + the single shared renderer.
 * Preview, test sends and production all go through renderEmail().
 * ------------------------------------------------------------------ */

export type TemplateType = "staff" | "customer";

export type TemplateCopy = {
  subject: string;
  heading: string;
  body: string;
  signoff: string;
};

export const DEFAULT_TEMPLATES: Record<TemplateType, TemplateCopy> = {
  staff: {
    subject: "New quote request — {{company}} ({{items_count}} items)",
    heading: "New quote request",
    body: "A new quote request came in on {{quote_date}}. The customer details and requested items are below.",
    signoff: "You can reply directly to {{customer_email}}.",
  },
  customer: {
    subject: "We've received your quote request — Vibrand",
    heading: "Thanks — we've got your request",
    body: `Hi {{customer_name}},

Thank you for your quote request. Our team is reviewing it now and will get back to you with pricing, options and lead times within 24 hours (Monday to Friday).`,
    signoff: `If anything needs changing in the meantime, just reply to this email.

Warm regards,
Vibrand Caribbean Inc.
sales@vibrand.com · +1 (246) 625-1000`,
  },
};

export const MERGE_TAGS = [
  "customer_name",
  "company",
  "customer_email",
  "phone",
  "territory",
  "message",
  "items_count",
  "quote_date",
] as const;

export type MergeTag = (typeof MERGE_TAGS)[number];

/** Returns every unknown {{tag}} found in the supplied copy. */
export function findUnknownTags(copy: TemplateCopy): string[] {
  const found = new Set<string>();
  for (const value of [copy.subject, copy.heading, copy.body, copy.signoff]) {
    for (const match of value.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
      const tag = match[1] ?? "";
      if (!(MERGE_TAGS as readonly string[]).includes(tag)) found.add(tag);
    }
  }
  return [...found];
}

function tagValues(quote: QuoteEmailPayload): Record<MergeTag, string> {
  return {
    customer_name: quote.customer_name,
    company: quote.company,
    customer_email: quote.email,
    phone: quote.phone ?? "—",
    territory: quote.territory,
    message: quote.message ?? "—",
    items_count: String(quote.items.length),
    quote_date: new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

/** Replaces merge tags in plain text. Unknown tags are left as-is. */
export function fillTags(value: string, quote: QuoteEmailPayload): string {
  const values = tagValues(quote);
  return value.replace(/\{\{\s*([^}]*?)\s*\}\}/g, (whole, rawTag: string) => {
    const tag = rawTag as MergeTag;
    return tag in values ? values[tag] : whole;
  });
}

/** Plain text → escaped HTML paragraphs, blank lines separating paragraphs. */
function paragraphs(value: string, extraStyle = "") {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="font-size:14px;line-height:1.6;margin:0 0 14px;${extraStyle}">${escapeHtml(
          block,
        ).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

/**
 * THE renderer. Locked brand frame; only the plain-text copy is user supplied.
 * Assembly order: heading → body → (staff details) → items table → sign-off → footer.
 */
export function renderEmail(
  type: TemplateType,
  copy: TemplateCopy,
  quote: QuoteEmailPayload,
): { subject: string; html: string; text: string } {
  const subject = fillTags(copy.subject, quote).trim() || DEFAULT_TEMPLATES[type].subject;
  const heading = fillTags(copy.heading, quote);
  const body = fillTags(copy.body, quote);
  const signoff = fillTags(copy.signoff, quote);
  const link = `${siteOrigin()}/admin/quotes`;

  const details =
    type === "staff"
      ? `${field("Name", quote.customer_name)}
     ${field("Company", quote.company)}
     ${field("Email", quote.email)}
     ${field("Phone", quote.phone)}
     ${field("Territory", quote.territory)}
     ${quote.in_hand_date ? field("In-hand deadline", formatEmailDate(quote.in_hand_date)) : ""}
     ${field("Message", quote.message)}`
      : "";

  const itemsHeading =
    type === "staff" ? "Requested items" : "What you asked us about";

  const button =
    type === "staff"
      ? `<a href="${link}" style="display:inline-block;background:${LIME};color:${CHARCOAL};font-weight:700;text-decoration:none;padding:12px 20px;border-radius:999px;">Open in admin</a>`
      : "";

  const html = shell(
    heading,
    `${paragraphs(body)}
     ${details}
     <h2 style="font-size:15px;margin:20px 0 0;">${escapeHtml(itemsHeading)}</h2>
     ${itemsTable(quote.items)}
     ${paragraphs(signoff)}
     ${button}`,
  );

  const text = `${heading}

${body}
${
  type === "staff"
    ? `
Name: ${quote.customer_name}
Company: ${quote.company}
Email: ${quote.email}
Phone: ${quote.phone ?? "—"}
Territory: ${quote.territory}
${quote.in_hand_date ? `In-hand deadline: ${formatEmailDate(quote.in_hand_date)}\n` : ""}\
Message: ${quote.message ?? "—"}
`
    : ""
}
${itemsHeading}:
${itemsText(quote.items)}

${signoff}${type === "staff" ? `\n\nOpen in admin: ${link}` : ""}`;

  return { subject, html, text };
}

/** Reads the stored copy for one template, falling back to the shipped defaults. */
export async function loadTemplate(
  supabaseAdmin: Admin,
  type: TemplateType,
): Promise<TemplateCopy> {
  const { data } = await supabaseAdmin
    .from("email_templates")
    .select("subject, heading, body, signoff")
    .eq("template_type", type)
    .maybeSingle();
  return data ? (data as TemplateCopy) : DEFAULT_TEMPLATES[type];
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
      html: args.html,
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
      const staff = renderEmail("staff", await loadTemplate(supabaseAdmin, "staff"), quote);
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
      const customer = renderEmail(
        "customer",
        await loadTemplate(supabaseAdmin, "customer"),
        quote,
      );
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