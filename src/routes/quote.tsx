import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProductPlaceholder } from "@/components/site/ProductPlaceholder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuantityStepper } from "@/components/site/QuantityStepper";
import { supabase } from "@/integrations/supabase/client";
import { useQuoteList } from "@/lib/quote-list";
import { submitQuoteRequest } from "@/lib/quote-submit.functions";
import { TERRITORIES } from "@/lib/territories";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "Your Quote List | Request Pricing from Vibrand" },
      {
        name: "description",
        content:
          "Review your selected promotional products and submit a quote request. The Vibrand team responds within 24 hours.",
      },
      { property: "og:title", content: "Your Quote List | Request Pricing from Vibrand" },
      {
        property: "og:description",
        content: "Submit your branded merchandise quote request — no payment, no obligation.",
      },
    ],
  }),
  component: QuotePage,
});

const ARTWORK_MAX_BYTES = 20 * 1024 * 1024;
const ARTWORK_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "ai", "eps", "svg", "zip"];

function QuotePage() {
  const { items, updateItem, removeItem, clear } = useQuoteList();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [artwork, setArtwork] = useState<File | null>(null);
  const [botField, setBotField] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    company: "",
    email: "",
    phone: "",
    territory: "",
    message: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function pickArtwork(file: File | null) {
    if (!file) {
      setArtwork(null);
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ARTWORK_EXTENSIONS.includes(extension)) {
      toast.error("Please attach a JPG, PNG, PDF, AI, EPS, SVG or ZIP file.");
      return;
    }
    if (file.size > ARTWORK_MAX_BYTES) {
      toast.error("That file is larger than 20MB. Please attach a smaller version.");
      return;
    }
    setArtwork(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (items.length === 0) {
      toast.error("Add at least one product to your quote list first.");
      return;
    }
    if (!form.customer_name || !form.company || !form.email || !form.territory) {
      toast.error("Please fill in your name, company, email and territory.");
      return;
    }

    setSubmitting(true);
    try {
      let artworkUrl: string | null = null;
      if (artwork) {
        const path = `${crypto.randomUUID()}-${artwork.name.replace(/[^\w.-]+/g, "_")}`;
        const upload = await supabase.storage.from("quote-artwork").upload(path, artwork);
        if (upload.error) throw upload.error;
        artworkUrl = path;
      }

      await submitQuoteRequest({
        data: {
          ...form,
          artwork_url: artworkUrl,
          website: botField,
          items: items.map((item) => ({
            product_id: item.productId,
            product_name: item.name,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        },
      });

      clear();
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong sending your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <SiteLayout>
        <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center sm:px-6">
          <CheckCircle2 className="mx-auto size-14 text-primary" />
          <h1 className="mt-6 text-3xl font-bold">Thanks — request received</h1>
          <p className="mt-4 text-muted-foreground">
            Our team will respond within 24 hours with pricing, options and lead times.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/">Keep browsing</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-n-900 sm:text-4xl">Your Quote List</h1>
        <p className="mt-3 text-n-500">
          Nothing is being purchased here. Send us your list and we'll reply with a formal quote.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-n-200 p-10 text-center">
                <p className="text-n-500">Your quote list is empty.</p>
                <Button asChild className="mt-5 bg-navy-700 text-white hover:bg-navy-800">
                  <Link to="/">Browse products</Link>
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-4 rounded-2xl border border-n-200 bg-white p-4 shadow-card"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="size-24 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <ProductPlaceholder className="size-24 shrink-0 rounded-xl" />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-n-900">{item.name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-n-500">Qty</Label>
                      <QuantityStepper
                        quantity={item.quantity}
                        moq={item.moq ?? null}
                        onChange={(value) => updateItem(item.productId, { quantity: value })}
                      />
                    </div>
                    <Textarea
                      value={item.notes}
                      onChange={(event) => updateItem(item.productId, { notes: event.target.value })}
                      placeholder="Notes: logo placement, colours, sizes…"
                      rows={2}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-n-200 bg-lime-50 p-6 shadow-card"
          >
            <h2 className="text-xl font-bold text-n-900">Request a quote</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="customer_name">Name *</Label>
                <Input
                  id="customer_name"
                  required
                  value={form.customer_name}
                  onChange={(event) => set("customer_name")(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="company">Company name *</Label>
                <Input
                  id="company"
                  required
                  value={form.company}
                  onChange={(event) => set("company")(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => set("email")(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => set("phone")(event.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Territory / location *</Label>
              <Select value={form.territory} onValueChange={set("territory")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select your territory" />
                </SelectTrigger>
                <SelectContent>
                  {TERRITORIES.map((territory) => (
                    <SelectItem key={territory} value={territory}>
                      {territory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={4}
                value={form.message}
                onChange={(event) => set("message")(event.target.value)}
                placeholder="Deadlines, event details, anything else we should know."
              />
            </div>

            <div>
              <Label htmlFor="artwork">Logo / artwork (optional)</Label>
              <label
                htmlFor="artwork"
                className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary"
              >
                <Upload className="size-4" />
                {artwork ? artwork.name : "Choose a file"}
              </label>
              <input
                id="artwork"
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.ai,.eps,.svg,.zip"
                onChange={(event) => pickArtwork(event.target.files?.[0] ?? null)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                JPG, PNG, PDF, AI, EPS, SVG or ZIP · up to 20MB
              </p>
            </div>

            <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={botField}
                onChange={(event) => setBotField(event.target.value)}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-navy-700 text-white hover:bg-navy-800"
              disabled={submitting}
            >
              {submitting ? "Sending…" : "Submit Quote Request"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              We respond within 24 hours, Mon–Fri.
            </p>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}