import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, RotateCcw, Save, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MERGE_TAG_HELP,
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_LABELS,
  type EmailTemplateRow,
  type TemplateType,
} from "@/lib/email-settings";
import { previewEmailTemplate, resetEmailTemplate, saveEmailTemplate, sendTestEmail } from "@/lib/email.functions";

type Draft = { subject: string; heading: string; body: string; signoff: string };

type FieldName = keyof Draft;

export function EmailTemplateEditor({
  type,
  row,
  onBack,
}: {
  type: TemplateType;
  row: EmailTemplateRow | undefined;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const preview = useServerFn(previewEmailTemplate);
  const save = useServerFn(saveEmailTemplate);
  const reset = useServerFn(resetEmailTemplate);
  const test = useServerFn(sendTestEmail);

  const [draft, setDraft] = useState<Draft>({
    subject: row?.subject ?? "",
    heading: row?.heading ?? "",
    body: row?.body ?? "",
    signoff: row?.signoff ?? "",
  });
  const [html, setHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [unknownTags, setUnknownTags] = useState<string[]>([]);
  const [testAddress, setTestAddress] = useState("");
  const focused = useRef<FieldName>("body");
  const refs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  // Debounced live preview through the production renderer.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!draft.subject.trim() || !draft.heading.trim()) return;
      preview({ data: { template: type, draft } })
        .then((result) => {
          setHtml(result.html);
          setPreviewSubject(result.subject);
          setUnknownTags(result.unknownTags);
        })
        .catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, preview, type]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { template: type, draft } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        toast.error(result.error ?? "Those merge tags aren't recognised.");
        return;
      }
      toast.success(`${TEMPLATE_LABELS[type]} template saved.`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => reset({ data: { template: type } }),
    onSuccess: async (result) => {
      setDraft(result.draft);
      toast.success("Restored the original copy.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: () => test({ data: { template: type, to: testAddress.trim(), draft } }),
    onSuccess: async (result) => {
      if (result.ok) toast.success(`Test of this draft sent to ${testAddress.trim()}.`);
      else toast.error(result.error ?? "The test email failed — see the log for details.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "email-log"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function insertTag(tag: string) {
    const name = focused.current;
    const element = refs.current[name];
    const token = `{{${tag}}}`;
    setDraft((prev) => {
      const value = prev[name];
      const start = element?.selectionStart ?? value.length;
      const end = element?.selectionEnd ?? value.length;
      const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
      requestAnimationFrame(() => {
        element?.focus();
        const caret = start + token.length;
        element?.setSelectionRange(caret, caret);
      });
      return { ...prev, [name]: next };
    });
  }

  const field = (name: FieldName) => ({
    value: draft[name],
    onFocus: () => {
      focused.current = name;
    },
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((prev) => ({ ...prev, [name]: event.target.value })),
  });

  const iframeSrc = useMemo(() => html, [html]);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-n-500 hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All templates
      </button>
      <h2 className="text-xl font-bold">{TEMPLATE_LABELS[type]}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{TEMPLATE_DESCRIPTIONS[type]}</p>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm font-semibold">Insert a detail</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click to drop it into the field you were last editing. It's replaced with the real
              value when the email goes out.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MERGE_TAG_HELP.map((entry) => (
                <button
                  key={entry.tag}
                  type="button"
                  title={entry.note}
                  onClick={() => insertTag(entry.tag)}
                  className="rounded-full border border-n-200 bg-navy-50 px-2.5 py-1 text-[11px] font-medium hover:bg-lime-500 hover:text-n-700"
                >
                  {`{{${entry.tag}}}`}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-0.5 text-[11px] text-muted-foreground">
              {MERGE_TAG_HELP.map((entry) => (
                <li key={entry.tag}>
                  <code>{`{{${entry.tag}}}`}</code> — {entry.note}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-white p-4">
            <div>
              <Label htmlFor="tpl-subject">Subject line</Label>
              <Input
                id="tpl-subject"
                ref={(element) => {
                  refs.current.subject = element;
                }}
                {...field("subject")}
              />
            </div>
            <div>
              <Label htmlFor="tpl-heading">Heading</Label>
              <Input
                id="tpl-heading"
                ref={(element) => {
                  refs.current.heading = element;
                }}
                {...field("heading")}
              />
            </div>
            <div>
              <Label htmlFor="tpl-body">Body message</Label>
              <Textarea
                id="tpl-body"
                rows={6}
                ref={(element) => {
                  refs.current.body = element;
                }}
                {...field("body")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Plain text only. Blank lines start a new paragraph.
              </p>
            </div>
            <div>
              <Label htmlFor="tpl-signoff">Sign-off text</Label>
              <Textarea
                id="tpl-signoff"
                rows={5}
                ref={(element) => {
                  refs.current.signoff = element;
                }}
                {...field("signoff")}
              />
            </div>

            {unknownTags.length ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                Unrecognised tags: {unknownTags.map((tag) => `{{${tag}}}`).join(", ")}. Fix these
                before saving.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                <Save className="mr-2 size-4" />
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={resetMutation.isPending}>
                    <RotateCcw className="mr-2 size-4" /> Reset to default
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restore the original copy?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This replaces the subject, heading, body and sign-off of the{" "}
                      {TEMPLATE_LABELS[type].toLowerCase()} with the wording it shipped with.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetMutation.mutate()}>
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="border-t border-n-200 pt-4">
              <Label htmlFor="tpl-test">Send this draft as a test</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                <Input
                  id="tpl-test"
                  className="sm:max-w-xs"
                  placeholder="you@company.com"
                  value={testAddress}
                  onChange={(event) => setTestAddress(event.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={testMutation.isPending}
                  onClick={() => {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testAddress.trim())) {
                      toast.error("Enter an address to send the test to.");
                      return;
                    }
                    testMutation.mutate();
                  }}
                >
                  <Send className="mr-2 size-4" /> Send test
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sends exactly what you see in the preview, including unsaved edits.
              </p>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-border bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-n-500">Live preview</p>
            <p className="mt-1 truncate text-sm font-semibold">{previewSubject || "…"}</p>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={iframeSrc}
              className="mt-2 h-[640px] w-full rounded-lg border border-n-200 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}