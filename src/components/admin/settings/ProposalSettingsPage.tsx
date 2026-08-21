import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ITEMS_PER_PAGE_CHOICES,
  PROPOSAL_SETTINGS_FALLBACK,
  proposalFilename,
  proposalSettingsQuery,
  type ProposalSettingsRow,
} from "@/lib/proposal-settings";

/**
 * Admin-only editor for the five proposal presentation settings. The share
 * page footer, the printed pagination and the exported filename all read this
 * single row, so this page is the one place they change.
 */
export function ProposalSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery(proposalSettingsQuery);
  const [draft, setDraft] = useState<ProposalSettingsRow>(PROPOSAL_SETTINGS_FALLBACK);

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async (row: ProposalSettingsRow) => {
      const { error } = await supabase.from("proposal_settings").update(row).eq("id", "default");
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Proposal settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "proposal-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Proposals</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How generated proposals are presented to clients, paginated for print, and named when
        exported as a PDF.
      </p>

      <div className="mt-4 space-y-5 rounded-xl border border-border bg-white p-4">
        <div>
          <Label htmlFor="filename">PDF filename template</Label>
          <Input
            id="filename"
            value={draft.filename_template}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, filename_template: event.target.value }))
            }
            className="mt-1.5"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Use {"{client}"}, {"{project}"} and {"{date}"}. Preview:{" "}
            <span className="font-semibold text-navy-900">
              {proposalFilename(draft.filename_template, {
                client: "Abeds",
                project: "Independence T-Shirts",
                dateISO: null,
              })}
              .pdf
            </span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Items per printed page</Label>
            <Select
              value={String(draft.items_per_page)}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, items_per_page: Number(value) }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_CHOICES.map((choice) => (
                  <SelectItem key={choice} value={String(choice)}>
                    {choice} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="validity">Validity (days)</Label>
            <Input
              id="validity"
              type="number"
              min={1}
              max={365}
              value={draft.validity_days}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, validity_days: Number(event.target.value) }))
              }
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="footer">Share page footer</Label>
          <Textarea
            id="footer"
            rows={2}
            value={draft.footer_text}
            onChange={(event) => setDraft((prev) => ({ ...prev, footer_text: event.target.value }))}
            className="mt-1.5"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">Clients can export a PDF</p>
            <p className="text-xs text-muted-foreground">
              Shows the “Export as PDF” button on the shared proposal page.
            </p>
          </div>
          <Switch
            checked={draft.client_can_export}
            onCheckedChange={(value) =>
              setDraft((prev) => ({ ...prev, client_can_export: value }))
            }
          />
        </div>

        <div className="flex justify-end">
          <Button
            disabled={save.isPending || settings.isLoading}
            onClick={() => save.mutate(draft)}
            className="bg-navy-900 text-white hover:bg-navy-800"
          >
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
