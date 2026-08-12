import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMAIL_SETTINGS_FALLBACK,
  EMAIL_TYPE_LABELS,
  emailLogQuery,
  emailSettingsQuery,
  emailTemplatesQuery,
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_LABELS,
  type EmailLogRow,
  type EmailSettingsRow,
  type TemplateType,
} from "@/lib/email-settings";
import { getEmailStatus, sendTestEmail, updateEmailSettings } from "@/lib/email.functions";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/admin/email")({
  beforeLoad: ({ context }) => {
    if (!context.access.isAdmin) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Email Settings | Vibrand Admin" },
      {
        name: "description",
        content: "Control quote notification emails, recipients, test sends and the email log.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailSettingsPage,
});

function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery(emailSettingsQuery);
  const logs = useQuery(emailLogQuery);
  const save = useServerFn(updateEmailSettings);
  const test = useServerFn(sendTestEmail);
  const status = useQuery({
    queryKey: ["admin", "email-status"],
    queryFn: () => getEmailStatus(),
    staleTime: 60_000,
  });

  const [draft, setDraft] = useState<EmailSettingsRow>(EMAIL_SETTINGS_FALLBACK);
  const [newRecipient, setNewRecipient] = useState("");
  const [testAddress, setTestAddress] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const templates = useQuery(emailTemplatesQuery);
  const [editing, setEditing] = useState<TemplateType | null>(null);
  const [openLog, setOpenLog] = useState<EmailLogRow | null>(null);

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  const mutation = useMutation({
    mutationFn: (rows: EmailSettingsRow) => save({ data: rows }),
    onSuccess: async () => {
      toast.success("Email settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "email-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (template: "staff" | "customer") =>
      test({ data: { template, to: testAddress.trim() } }),
    onSuccess: async (result) => {
      if (result.ok) toast.success(`Test email sent to ${testAddress.trim()}.`);
      else toast.error(result.error ?? "The test email failed — see the log for details.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "email-log"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function addRecipient() {
    const value = newRecipient.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (draft.recipients.includes(value)) {
      toast.error("That address is already on the list.");
      return;
    }
    setDraft((prev) => ({ ...prev, recipients: [...prev.recipients, value] }));
    setNewRecipient("");
  }

  function sendTest(template: "staff" | "customer") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testAddress.trim())) {
      toast.error("Enter an address to send the test to.");
      return;
    }
    testMutation.mutate(template);
  }

  const rows = (logs.data ?? []).filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (typeFilter !== "all" && row.type !== typeFilter) return false;
    const term = search.trim().toLowerCase();
    if (term && !`${row.recipient} ${row.subject}`.toLowerCase().includes(term)) return false;
    return true;
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Email</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Control the two quote emails, who gets notified, and review every send.
      </p>

      <div className="mt-4 rounded-xl border border-border bg-white p-4">
        {status.isLoading ? (
          <p className="text-sm text-muted-foreground">Checking sending status…</p>
        ) : status.data?.domainVerified ? (
          <div className="text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 text-lime-700" />
              {status.data.sendDomain ?? "vibrand.com"} is verified — sending as{" "}
              {status.data.fromAddress}
            </p>
            {status.data.domainState === "unreadable" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                The saved Resend key is send-only, so verification status can't be read back — live
                sends still use {status.data.fromAddress}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>
              <strong>Test mode.</strong> vibrand.com isn't verified yet, so emails go out from{" "}
              {status.data?.fromAddress ?? "onboarding@resend.dev"}. Add the DNS records at GoDaddy
              and this switches over automatically.
              {status.data && !status.data.apiKeyConfigured
                ? " The Resend API key is also missing."
                : ""}
              {status.data?.domainDetail ? ` (${status.data.domainDetail})` : ""}
            </span>
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => status.refetch()}
          disabled={status.isFetching}
        >
          <RefreshCw className="mr-2 size-3.5" /> Re-check
        </Button>
      </div>

      <Tabs defaultValue="settings" className="mt-6">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="log">Email log</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-5 pt-4">
          <section className="space-y-4 rounded-xl border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Staff notification</p>
                <p className="text-sm text-muted-foreground">
                  Emails your team every time a quote request arrives.
                </p>
              </div>
              <Switch
                checked={draft.staff_notify_enabled}
                onCheckedChange={(value) =>
                  setDraft((prev) => ({ ...prev, staff_notify_enabled: value }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Customer confirmation</p>
                <p className="text-sm text-muted-foreground">
                  Emails the customer a receipt of their request.
                </p>
              </div>
              <Switch
                checked={draft.customer_confirm_enabled}
                onCheckedChange={(value) =>
                  setDraft((prev) => ({ ...prev, customer_confirm_enabled: value }))
                }
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4">
            <p className="font-semibold">Notification recipients</p>
            <ul className="mt-3 space-y-2">
              {draft.recipients.length === 0 ? (
                <li className="text-sm text-muted-foreground">No recipients yet.</li>
              ) : (
                draft.recipients.map((recipient) => (
                  <li
                    key={recipient}
                    className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2 text-sm"
                  >
                    {recipient}
                    <button
                      type="button"
                      aria-label={`Remove ${recipient}`}
                      className="rounded p-1 text-n-500 hover:bg-white"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          recipients: prev.recipients.filter((item) => item !== recipient),
                        }))
                      }
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                value={newRecipient}
                placeholder="name@company.com"
                onChange={(event) => setNewRecipient(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addRecipient();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addRecipient}>
                <Plus className="mr-1 size-4" /> Add
              </Button>
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border border-border bg-white p-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="from_name">From name</Label>
              <Input
                id="from_name"
                value={draft.from_name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, from_name: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="reply_to">Reply-to address</Label>
              <Input
                id="reply_to"
                value={draft.reply_to}
                onChange={(event) => setDraft((prev) => ({ ...prev, reply_to: event.target.value }))}
              />
            </div>
          </section>

          <Button onClick={() => mutation.mutate(draft)} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save email settings"}
          </Button>

          <section className="rounded-xl border border-border bg-white p-4">
            <p className="font-semibold">Send a test email</p>
            <p className="text-sm text-muted-foreground">
              Uses sample quote data and your saved from-name and reply-to.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                className="sm:max-w-xs"
                value={testAddress}
                placeholder="you@company.com"
                onChange={(event) => setTestAddress(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => sendTest("staff")}
                disabled={testMutation.isPending}
              >
                <Send className="mr-2 size-4" /> Staff template
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => sendTest("customer")}
                disabled={testMutation.isPending}
              >
                <Send className="mr-2 size-4" /> Customer template
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="log" className="pt-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="sm:max-w-xs"
              value={search}
              placeholder="Search recipient or subject"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Newest first · log entries are kept for 90 days.
          </p>

          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-xs uppercase tracking-wide text-n-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Recipient</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No email activity yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-n-200 align-top">
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{EMAIL_TYPE_LABELS[row.type] ?? row.type}</td>
                      <td className="px-3 py-2">{row.recipient}</td>
                      <td className="px-3 py-2">{row.subject}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            row.status === "sent"
                              ? "bg-lime-500 text-n-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                        {row.error ? (
                          <p className="mt-1 max-w-[320px] text-xs text-red-600">{row.error}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}