import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type EmailSettingsRow = {
  staff_notify_enabled: boolean;
  customer_confirm_enabled: boolean;
  recipients: string[];
  reply_to: string;
  from_name: string;
};

export const EMAIL_SETTINGS_FALLBACK: EmailSettingsRow = {
  staff_notify_enabled: true,
  customer_confirm_enabled: true,
  recipients: [],
  reply_to: "sales@vibrand.com",
  from_name: "Vibrand",
};

export const emailSettingsQuery = queryOptions({
  queryKey: ["admin", "email-settings"],
  queryFn: async (): Promise<EmailSettingsRow> => {
    const { data, error } = await supabase
      .from("email_settings")
      .select("staff_notify_enabled, customer_confirm_enabled, recipients, reply_to, from_name")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    return (data as EmailSettingsRow | null) ?? EMAIL_SETTINGS_FALLBACK;
  },
});

export type EmailLogRow = {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  status: string;
  error: string | null;
  html: string | null;
  created_at: string;
};

export const emailLogQuery = queryOptions({
  queryKey: ["admin", "email-log"],
  queryFn: async (): Promise<EmailLogRow[]> => {
    const { data, error } = await supabase
      .from("email_log")
      .select("id, type, recipient, subject, status, error, html, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as EmailLogRow[];
  },
});

export type TemplateType = "staff" | "customer";

export type EmailTemplateRow = {
  template_type: TemplateType;
  subject: string;
  heading: string;
  body: string;
  signoff: string;
  updated_at: string;
  updated_by_name: string;
};

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  staff: "Staff notification",
  customer: "Customer confirmation",
};

export const TEMPLATE_DESCRIPTIONS: Record<TemplateType, string> = {
  staff: "Sent to your notification recipients when a quote request arrives.",
  customer: "Sent to the customer as a receipt of their request.",
};

/** Merge tags available in template copy, with a plain-English note each. */
export const MERGE_TAG_HELP: { tag: string; note: string }[] = [
  { tag: "customer_name", note: "The person's full name" },
  { tag: "company", note: "Their company name" },
  { tag: "customer_email", note: "Their email address" },
  { tag: "phone", note: "Their phone number (— if blank)" },
  { tag: "territory", note: "The territory they selected" },
  { tag: "message", note: "Their message (— if blank)" },
  { tag: "items_count", note: "How many products they requested" },
  { tag: "quote_date", note: "The date of the request" },
];

export const emailTemplatesQuery = queryOptions({
  queryKey: ["admin", "email-templates"],
  queryFn: async (): Promise<EmailTemplateRow[]> => {
    const { data, error } = await supabase
      .from("email_templates")
      .select("template_type, subject, heading, body, signoff, updated_at, updated_by_name");
    if (error) throw error;
    return (data ?? []) as EmailTemplateRow[];
  },
});

export const EMAIL_TYPE_LABELS: Record<string, string> = {
  staff_notification: "Staff notification",
  customer_confirmation: "Customer confirmation",
  test_staff: "Test — staff",
  test_customer: "Test — customer",
};

export type ContactRow = {
  id: string;
  email: string;
  name: string;
  company: string;
  phone: string | null;
  territory: string;
  marketing_opt_in: boolean;
  first_request_at: string;
  last_request_at: string;
  request_count: number;
};

export const contactsQuery = queryOptions({
  queryKey: ["admin", "contacts"],
  queryFn: async (): Promise<ContactRow[]> => {
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, email, name, company, phone, territory, marketing_opt_in, first_request_at, last_request_at, request_count",
      )
      .order("last_request_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ContactRow[];
  },
});