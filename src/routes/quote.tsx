import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { QuantityStepper } from "@/components/site/QuantityStepper";
import { supabase } from "@/integrations/supabase/client";
import { useQuoteList, type QuoteItem } from "@/lib/quote-list";
import { ARTWORK_MAX_BYTES, isAllowedArtwork } from "@/lib/artwork";
import { createArtworkUpload } from "@/lib/artwork.functions";
import { submitQuoteRequest } from "@/lib/quote-submit.functions";
import { fallbackToOriginal } from "@/lib/image-variants";
import { COMPANY, TERRITORIES } from "@/lib/territories";

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

const IMAGE_PREFIX = "/api/public/product-image/";

/** Small derivative for the 64px row thumb; falls back to the stored original. */
function thumbSrc(url: string) {
  if (!url.startsWith(IMAGE_PREFIX)) return url;
  if (/__(card|thumb)\.webp$/.test(url)) return url;
  return url.replace(/\.[^./]+$/, "__thumb.webp");
}

const CARD = "rounded-2xl border border-n-200 bg-white shadow-card overflow-hidden";
const BAND = "flex h-[54px] items-center justify-between gap-3 px-5 border-b";
const CHIP = "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide";
const FIELD_LABEL = "text-[12.5px] font-semibold text-n-900";
const FIELD_INPUT =
  "mt-1.5 h-[38px] rounded-[10px] border-n-200 focus-visible:ring-2 focus-visible:ring-lime-500";

function Optional() {
  return <span className="font-normal text-n-500">(optional)</span>;
}

function QuoteItemRow({
  item,
  onQuantity,
  onNotes,
  onRemove,
}: {
  item: QuoteItem;
  onQuantity: (value: number) => void;
  onNotes: (value: string) => void;
  onRemove: () => void;
}) {
  const [notesOpen, setNotesOpen] = useState(Boolean(item.notes));
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const meta = [item.sku, item.moq ? `MOQ ${item.moq}` : null].filter(Boolean).join(" · ");

  return (
    <div className="flex gap-3.5 p-5">
      {item.image ? (
        <img
          src={thumbSrc(item.image)}
          onError={(event) => fallbackToOriginal(event, item.image as string)}
          alt={item.name}
          loading="lazy"
          className="size-16 shrink-0 rounded-[10px] border border-n-200 bg-white object-contain p-1"
        />
      ) : (
        <ProductPlaceholder className="size-16 shrink-0 rounded-[10px] border border-n-200" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {meta ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-n-500">{meta}</p>
            ) : null}
            <p className="mt-0.5 text-[14.5px] font-semibold leading-snug text-n-900">
              {item.name}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Remove ${item.name}`}
            onClick={onRemove}
            className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-n-400 transition-colors hover:bg-n-100 hover:text-n-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-3">
          <QuantityStepper
            quantity={item.quantity}
            moq={item.moq ?? null}
            size="compact"
            onChange={onQuantity}
          />
          {!notesOpen ? (
            <button
              type="button"
              className="text-[12.5px] font-semibold text-navy-700 hover:underline"
              onClick={() => {
                setNotesOpen(true);
                requestAnimationFrame(() => notesRef.current?.focus());
              }}
            >
              + Add notes
            </button>
          ) : null}
        </div>

        {notesOpen ? (
          <Textarea
            ref={notesRef}
            value={item.notes}
            onChange={(event) => onNotes(event.target.value)}
            placeholder="Logo placement, colours, sizes…"
            rows={2}
            className="mt-2.5 rounded-[10px] border-n-200 bg-n-50 text-[13px]"
          />
        ) : null}
      </div>
    </div>
  );
}

function QuotePage() {
  const { items, updateItem, removeItem, clear } = useQuoteList();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [artwork, setArtwork] = useState<File | null>(null);
  const [botField, setBotField] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    company: "",
    email: "",
    phone: "",
    territory: "",
    message: "",
    in_hand_date: "",
  });

  const today = new Date().toISOString().slice(0, 10);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function pickArtwork(file: File | null) {
    if (!file) {
      setArtwork(null);
      return;
    }
    if (!isAllowedArtwork(file.name)) {
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
        // Server validates type/size and issues a one-object signed upload token.
        const ticket = await createArtworkUpload({
          data: { filename: artwork.name, size: artwork.size },
        });
        const upload = await supabase.storage
          .from("quote-artwork")
          .uploadToSignedUrl(ticket.path, ticket.token, artwork);
        if (upload.error) throw upload.error;
        artworkUrl = ticket.path;
      }

      await submitQuoteRequest({
        data: {
          ...form,
          in_hand_date: form.in_hand_date ? form.in_hand_date : null,
          artwork_url: artworkUrl,
          website: botField,
          marketing_opt_in: marketingOptIn,
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
        <div className="site-container max-w-[720px] py-16 text-center lg:py-24">
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
      <div className="site-container mx-auto max-w-[1200px] py-10 lg:py-14">
        <h1 className="font-display text-[24px] font-semibold leading-[1.3] text-n-900 lg:text-[32px]">
          Request a quote
        </h1>
        <p className="mt-3 max-w-[720px] leading-[1.5] text-n-500">
          Nothing is purchased here — send us your list and we'll reply with a formal quote within 24
          hours, Mon–Fri.
        </p>

        <div className="mt-8 grid gap-7 lg:mt-10 lg:grid-cols-[1fr_430px]">
          {/* ITEMS */}
          <section className={CARD}>
            <header className={`${BAND} border-n-200 bg-white`}>
              <h2 className="text-[15px] font-semibold text-n-900">Your items</h2>
              <span className={`${CHIP} bg-n-100 text-n-700`}>
                {items.length} item{items.length === 1 ? "" : "s"}
              </span>
            </header>

            {items.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[14px] text-n-500">Your quote list is empty.</p>
                <Link
                  to="/"
                  className="mt-4 inline-flex text-[13px] font-semibold text-navy-700 hover:underline"
                >
                  Browse products →
                </Link>
              </div>
            ) : (
              <>
                <div className="divide-y divide-n-100">
                  {items.map((item) => (
                    <QuoteItemRow
                      key={item.productId}
                      item={item}
                      onQuantity={(value) => updateItem(item.productId, { quantity: value })}
                      onNotes={(value) => updateItem(item.productId, { notes: value })}
                      onRemove={() => removeItem(item.productId)}
                    />
                  ))}
                </div>
                <footer className="border-t border-n-200 p-4">
                  <Link
                    to="/"
                    className="text-[13px] font-semibold text-navy-700 hover:underline"
                  >
                    ← Add more products
                  </Link>
                </footer>
              </>
            )}
          </section>

          {/* DETAILS */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <section className={CARD}>
              <header className={`${BAND} border-navy-800 bg-navy-700`}>
                <h2 className="text-[15px] font-semibold text-white">Your details</h2>
                <span className={`${CHIP} bg-white/15 text-white`}>Takes ~1 min</span>
              </header>

              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <p className="text-[12.5px] text-n-500">
                  We'll send the formal quote to this email.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="customer_name" className={FIELD_LABEL}>
                      Name *
                    </Label>
                    <Input
                      id="customer_name"
                      required
                      className={FIELD_INPUT}
                      value={form.customer_name}
                      onChange={(event) => set("customer_name")(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company" className={FIELD_LABEL}>
                      Company name *
                    </Label>
                    <Input
                      id="company"
                      required
                      className={FIELD_INPUT}
                      value={form.company}
                      onChange={(event) => set("company")(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className={FIELD_LABEL}>
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      className={FIELD_INPUT}
                      value={form.email}
                      onChange={(event) => set("email")(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className={FIELD_LABEL}>
                      Phone <Optional />
                    </Label>
                    <Input
                      id="phone"
                      className={FIELD_INPUT}
                      value={form.phone}
                      onChange={(event) => set("phone")(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label className={FIELD_LABEL}>Territory *</Label>
                    <Select value={form.territory} onValueChange={set("territory")}>
                      <SelectTrigger className={FIELD_INPUT}>
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
                    <Label htmlFor="in_hand_date" className={FIELD_LABEL}>
                      In-hand deadline <Optional />
                    </Label>
                    <Input
                      id="in_hand_date"
                      type="date"
                      min={today}
                      className={FIELD_INPUT}
                      value={form.in_hand_date}
                      onChange={(event) => set("in_hand_date")(event.target.value)}
                    />
                    <p className="mt-1 text-[11px] text-n-500">
                      The date you need the goods delivered.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="message" className={FIELD_LABEL}>
                    Message <Optional />
                  </Label>
                  <Textarea
                    id="message"
                    rows={4}
                    className="mt-1.5 rounded-[10px] border-n-200 text-[13px]"
                    value={form.message}
                    onChange={(event) => set("message")(event.target.value)}
                    placeholder="Event details, anything else we should know."
                  />
                </div>

                <div>
                  <Label htmlFor="artwork" className={FIELD_LABEL}>
                    Logo / artwork <Optional />
                  </Label>
                  <label
                    htmlFor="artwork"
                    className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-[10px] border border-dashed border-n-200 px-4 py-3 text-[13px] text-n-500 hover:border-lime-500"
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
                  <p className="mt-1 text-[11px] text-n-500">
                    JPG, PNG, PDF, AI, EPS, SVG or ZIP · up to 20MB
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="marketing_opt_in"
                    checked={marketingOptIn}
                    onCheckedChange={(value) => setMarketingOptIn(value === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="marketing_opt_in" className="text-[13px] font-normal text-n-500">
                    Keep me updated on new products and offers
                  </Label>
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
                  className="h-11 w-full bg-navy-700 text-white hover:bg-navy-800"
                  disabled={submitting}
                >
                  {submitting
                    ? "Sending…"
                    : `Submit quote request · ${items.length} item${items.length === 1 ? "" : "s"}`}
                </Button>

                <ol className="space-y-2 pt-1">
                  {[
                    "You send your list",
                    "We confirm artwork & details",
                    "Formal quote within 24h",
                  ].map((step, index) => (
                    <li key={step} className="flex items-center gap-2.5">
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-lime-50 text-[11px] font-semibold text-n-900">
                        {index + 1}
                      </span>
                      <span className="text-[11.5px] text-n-500">{step}</span>
                    </li>
                  ))}
                </ol>

                <p className="text-[11.5px] text-n-500">
                  Prefer email?{" "}
                  <a href={`mailto:${COMPANY.email}`} className="font-semibold text-navy-700 hover:underline">
                    {COMPANY.email}
                  </a>{" "}
                  ·{" "}
                  <a
                    href={`tel:${COMPANY.phone.replace(/[^\d+]/g, "")}`}
                    className="font-semibold text-navy-700 hover:underline"
                  >
                    {COMPANY.phone}
                  </a>
                </p>
              </form>
            </section>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
