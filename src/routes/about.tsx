import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe2, Award, Handshake, Ship } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Vibrand | Caribbean Promotional Products Supplier" },
      {
        name: "description",
        content:
          "Vibrand Caribbean Inc. supplies premium branded promotional products to businesses across 24 Caribbean territories, with global sourcing standards.",
      },
      { property: "og:title", content: "About Vibrand | Caribbean Promotional Products Supplier" },
      {
        property: "og:description",
        content:
          "Premium branded merchandise, sourced globally and delivered across the Caribbean by a team that knows the region.",
      },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  {
    icon: Globe2,
    title: "24 territories served",
    body: "From Barbados to Belize, we ship branded merchandise across the Caribbean region.",
  },
  {
    icon: Award,
    title: "Global standards",
    body: "Vetted factories, consistent print quality and colour matching you can rely on.",
  },
  {
    icon: Handshake,
    title: "Consultative service",
    body: "We help you choose the right product for your budget, audience and timeline.",
  },
  {
    icon: Ship,
    title: "Logistics handled",
    body: "Consolidated freight, customs paperwork and regional delivery managed for you.",
  },
];

function AboutPage() {
  return (
    <SiteLayout>
      <section className="bg-charcoal text-charcoal-foreground">
        <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">About us</p>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
            Branded merchandise, built for Caribbean business
          </h1>
          <p className="mt-6 text-lg text-charcoal-foreground/75">
            Vibrand Caribbean Inc. has spent decades helping Caribbean organisations put their brand
            into people's hands — from staff uniforms and conference giveaways to executive gifts and
            large-format display.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {VALUES.map((value) => (
            <div key={value.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <value.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{value.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{value.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-gradient-hero p-10 text-charcoal-foreground">
          <h2 className="text-2xl font-bold sm:text-3xl">Let's talk about your next project</h2>
          <p className="mt-3 max-w-xl text-charcoal-foreground/75">
            Build a quote list from our catalogue and our team will respond within 24 hours with
            pricing, options and lead times.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/">Browse Products</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}