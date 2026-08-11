# Admin access, roles, staff manager, storage hardening

## 1. Your first admin account
- Create the auth user Avinash Vaswani (avaswani@alvas.co), email pre-confirmed, with a temporary password I generate and give you in chat (you change it on first login).
- Add a `profiles` table (user id, display name, email, timestamps) so staff show as names, not emails. Seeded with "Avinash Vaswani".
- Insert an `admin` row in `user_roles` for that user.
- New page `/admin/account` ("My Account"): change display name, change password. Linked in the admin nav.

## 2. Role gate + staff manager
- `/auth` after sign-in: staff/admin go to `/admin`, anyone else goes to the home page with a short "no admin access" message.
- The `_authenticated` admin layout checks `is_staff` before rendering anything; a signed-in non-staff user is redirected home and never sees the shell.
- Admin-only nav items and `/admin/staff` route hidden and blocked for the `staff` role.
- `/admin/staff` (admin role only):
  - Table of all users: display name, email, role, date added.
  - Add staff: name + email + temporary password, choose role staff or admin; account is created pre-confirmed.
  - Change a user's role; remove a user (deletes the account).
  - Safety rails enforced server-side: cannot remove or demote yourself, cannot remove or demote the last remaining admin.
- Everything runs through server functions that verify the caller is an admin before touching anything. `user_roles` stays read-only from the browser (own row only) — no client writes.

## 3. Storage fixes
- Check whether `product-images` really serves public URLs. Preferred fix: flip the bucket to public read. Signed URLs are only a fallback if the platform genuinely blocks public buckets — and if that happens I will say so explicitly in the report and explain how expiry is handled so live images never break.
- Prove it end to end: attach one test image to one product, load it on the public site, then remove the test image and restore the product.
- Quote artwork uploads: accept only jpg, jpeg, png, pdf, ai, eps, svg, zip, max 20MB. Anything else gets a friendly inline error and is not uploaded. Enforced both in the form and on the bucket itself.
- Add a hidden honeypot field to the quote form; submissions that fill it are silently discarded server-side.

## Report back
Your email + temporary password, confirmation that a non-staff sign-in bounces to home while your account reaches `/admin`, and the outcome of the product image test.

## Technical notes
- Migrations: `profiles` table with GRANTs + RLS (own row read/update; staff read all), `is_admin(uuid)` helper wrapping the private role check, keep `user_roles` client-unwritable.
- Server functions in `src/lib/staff.functions.ts` + a `.server.ts` helper: all use `requireSupabaseAuth`, re-check the admin role via the user-scoped client, then use the service-role client (imported inside the handler) for Auth Admin create/delete and role writes.
- Admin layout gate stays `ssr: false`, adds a role check via a server function; role also cached in router context so nav can hide `/admin/staff`.
- Quote artwork type/size clamp added in `src/routes/quote.tsx` plus bucket allowed-mime/size limits; honeypot validated in `quote-submit.functions.ts`.
