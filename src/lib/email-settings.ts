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
  created_at: string;
};

export const emailLogQuery = queryOptions({
  queryKey: ["admin", "email-log"],
  queryFn: async (): Promise<EmailLogRow[]> => {
    const { data, error } = await supabase
      .from("email_log")
      .select("id, type, recipient, subject, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as EmailLogRow[];
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