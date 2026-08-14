# Make the Grid / Expanded toggle findable

## Why you can't see it

The toggle was only added to one page — `/products` (the "All products" list) — and only as two small unlabelled icon buttons next to the sort dropdown. The pages you actually browse on desktop, the home catalogue (`/`) and each category page (`/c/{slug}`), share a different component that never got the control, so there is nothing to click there.

## What changes

1. Put the toggle on every desktop browsing surface
   - Home catalogue and category pages (the shared desktop catalogue with the left category sidebar) get the same control, in the toolbar row beside the sort dropdown.
   - `/products` keeps its toggle, in the same position, so all three pages behave identically.
   - Still desktop-only (>=1024px); mobile and tablet keep today's grid exactly as-is.

2. Make it read as a control, not decoration
   - Two labelled segments — "Grid" and "Expanded" — with their icons, in a pill; the active one filled navy, the other quiet.
   - Screen-reader labels and pressed state preserved.

3. Keep the URL behaviour it already has
   - `?view=expanded` / `?view=grid`, shareable and refresh-safe.
   - Switching view keeps you on the same page of results instead of jumping back to page 1.
   - Home and category routes accept and preserve `view` the same way `/products` does.

4. Staff view untouched
   - The `/team` pricelist rows are unaffected; the toggle does not appear there.

## Technical notes

- Extract the toggle into `src/components/site/ViewToggle.tsx` (reads `view` from the URL, writes via the existing `useCatalogFilters().update`), then render it in both `src/components/site/DesktopCatalog.tsx` (customer mode only) and `src/routes/products.tsx` — one implementation, no copies.
- Add `view` to `validateSearch` and the `stripSearchParams` defaults in `src/routes/index.tsx` and `src/routes/c.$slug.tsx`, matching `/products`. `view` is already in `KNOWN_SEARCH_PARAMS`, so it will no longer be stripped.
- Move the expanded-card rendering plus the `getCustomerPricing` fetch (visible page only) into `DesktopCatalog` alongside its existing grid branch; `ProductExpandedCard` and the server function stay as built.
- Change the toggle's update call so it does not reset `page`.
- No schema, RLS, or pricing-logic changes; the server function still returns only qty + unit USD.
