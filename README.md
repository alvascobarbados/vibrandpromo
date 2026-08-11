# Alvasco Ecommerce 

Alvasco ECOMMERCE 

# Lovable Prompt — Alvasco Website Rebuild

Copy everything below the line and paste it as your first prompt in Lovable.

---

Build a full-stack web app for **Alvasco (Barbados) Ltd.**, a premium promotional products company serving businesses across 24 Caribbean territories. This replaces our current WordPress site (alvas.co). Use **Supabase** for the database, authentication, and image storage.

The app has two sides:

1. A **public, e-commerce-style catalog** where customers browse products and submit quote requests. There is NO checkout, NO payments, and NO shopping cart purchases — ever. The entire site funnels to "Request a Quote."
2. A **staff admin panel** that is extremely simple for non-technical employees to manage products, categories, and incoming quote requests without any developer help. This is the most important part of the project.

## Core concept

The site looks and feels like an online store, but nothing is sold directly. Every product's call-to-action is "Add to Quote." Products may or may not display a price — and even when a price is shown, the customer still submits a quote request. Prices shown are labeled "From $X.XX" as indicative only.

## Public site (no login required)

**Pages:**

- **Home:** hero with tagline "Premium Promotional Products. Caribbean Focus. Global Standards." with "Browse Products" and "Request a Quote" buttons; a "Trusted by Leading Caribbean Brands" client logo strip; featured categories grid; featured products; a short "How It Works" section (Browse → Build Your Quote List → We respond within 24 hours); client testimonials; contact CTA.
- **Catalog (/products):** responsive product grid, filter by category, keyword search, sort by newest/name.
- **Category pages** for each category.
- **Product detail page:** image gallery, description, product details/specs, price shown only if enabled for that product (otherwise "Request Pricing"), quantity selector, optional notes field (e.g., "logo placement, colors"), and a prominent **Add to Quote** button.
- **Quote List (/quote):** works like a cart but is called "Your Quote List" — shows items, quantities, and per-item notes, with a form to submit the request: Name*, Company Name*, Email*, Phone, Territory/Location* (dropdown of Caribbean territories: Barbados, Trinidad & Tobago, Jamaica, Bahamas, St. Lucia, Grenada, St. Vincent & the Grenadines, Antigua & Barbuda, Dominica, St. Kitts & Nevis, Aruba, Curaçao, Bonaire, Sint Maarten, Cayman Islands, Turks & Caicos, British Virgin Islands, Anguilla, Montserrat, Guyana, Suriname, Belize, Haiti, Dominican Republic, Other), Message, and an optional logo/artwork file upload. On submit, save to the database and show a confirmation ("Thanks — our team will respond within 24 hours").
- **About Us** and **Contact Us** pages (contact info: sales@alvas.co, +1 (246) 625-1000, Saint Michael, Barbados, Mon–Fri 8AM–5PM AST).
- Header shows a quote-list icon with a live item count. Fully mobile-responsive.

## Staff admin panel (/admin — login required)

Design this for staff with **zero technical skills**: big clear buttons, plain language, minimal steps, confirmation dialogs before anything is deleted, no jargon. Changes go live on the public site instantly.

- **Secure login** via Supabase Auth. Only users with a "staff" or "admin" role can access /admin. No public sign-up — admins invite/create staff accounts.
- **Dashboard:** count of new quote requests, list of the most recent requests, and quick-action buttons ("Add a Product," "View Quote Requests").
- **Products manager:** searchable/filterable table of all products. Add/Edit form with: name, category (dropdown), description, multiple image upload with drag-and-drop, price (optional), toggle "Show price on website," toggle "Active / Hidden," toggle "Featured on homepage." Include a "Duplicate product" button to make creating similar items fast.
- **Categories manager:** add, rename, reorder, and upload a category image.
- **Quote requests inbox:** list of all submitted requests with status badges — New / In Progress / Quoted / Won / Closed. Clicking a request shows the customer's details, territory, message, artwork file, and the full list of requested items with quantities and notes. Staff can update the status and add internal notes.
- If simple to include: send an email notification to a configurable staff address when a new quote request arrives. If this adds complexity, skip it for now.

## Database (Supabase)

- **categories:** id, name, slug, image_url, sort_order
- **products:** id, name, slug, category_id, description, price (nullable), show_price (boolean, default false), is_active (boolean, default true), is_featured (boolean, default false), images (array of URLs), created_at, updated_at
- **quote_requests:** id, customer_name, company, email, phone, territory, message, artwork_url, status (default "new"), internal_notes, created_at
- **quote_request_items:** id, quote_request_id, product_id, product_name (snapshot), quantity, notes
- **Row-level security:** public can read active products and categories, and can insert quote_requests and quote_request_items; only authenticated staff can read quote requests or write to products/categories.

## Design direction

Clean, modern, professional B2B look. Brand colors: **orange as the primary accent** with white and dark charcoal (matching the current Alvasco brand). Generous white space, product imagery front and center, rounded cards, trustworthy Caribbean-professional feel. Mobile experience is a priority.

## Seed data

Create these categories with placeholder images: Apparel, Bags, Drinkware, Barware & Food Service, Accessories & Novelties, Advertising & Display, Office & Stationery, Technology, Tools & Automotive, Keyrings. Add ~12 sample products spread across them (some with prices shown, some without) so the whole flow is demo-able immediately.

## Explicitly out of scope — do not build

- No payments, checkout, shipping calculation, or inventory tracking
- No customer accounts or customer login
- No blog or newsletter system for now
- Don't over-engineer — this is a v1 shell; we will add our real products ourselves through the admin panel.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vibrandpromo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9718e7a0-249f-44b3-a20a-e74f1aa526fd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
