import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";
import { COMPANY } from "@/lib/territories";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Alvasco | Promotional Products in Barbados" },
      {
        name: "description",
        content:
          "Reach the Alvasco team in Saint Michael, Barbados. Call +1 (246) 625-1000 or email sales@alvas.co, Monday to Friday 8AM–5PM AST.",
      },
      { property: "og:title", content: "Contact Alvasco | Promotional Products in Barbados" },
      {
        property: "og:description",
        content: "Call, email or send us a quote request — we respond within 24 hours.",
      },
    ],
  }),
  component: ContactPage,
});

const DETAILS = [
  { icon: Mail, label: "Email", value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  { icon: Phone, label: "Phone", value: COMPANY.phone, href: "tel:+12466251000" },
  { icon: MapPin, label: "Location", value: COMPANY.location },
  { icon: Clock, label: "Opening hours", value: COMPANY.hours },
];

function ContactPage() {
  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">Contact us</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Tell us what you need branded and we'll take it from there. For the fastest response, send
          through a quote list with the products you're interested in.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {DETAILS.map((detail) => (
            <div
              key={detail.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-card"
            >
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <detail.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{detail.label}</p>
                {detail.href ? (
                  <a href={detail.href} className="text-lg font-semibold hover:text-primary">
                    {detail.value}
                  </a>
                ) : (
                  <p className="text-lg font-semibold">{detail.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-secondary p-8">
          <h2 className="text-2xl font-bold">Ready for pricing?</h2>
          <p className="mt-2 text-muted-foreground">
            Add products to your quote list and submit the request form — no account needed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/products">Browse Products</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/quote">Request a Quote</Link>
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}