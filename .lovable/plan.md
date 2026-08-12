# Email Notifications for Quote Requests — Options Report

Report only. Nothing changed, installed, or signed up for.

## 1. Current state

- **No transactional email anywhere.** No email library, template, or send call exists in the codebase (no Resend/SendGrid/nodemailer/react-email, no email templates).
- **Quote submission sends nothing.** The validated quote server function inserts the request, its items and a rate-limit log row, then returns success. No staff notification, no customer confirmation.
- **Auth emails: effectively none are triggered today.**
  - Staff accounts are created server-side with an admin-set password and the email pre-confirmed — no invite or confirmation email.
  - The admin account page changes the password for the already signed-in user directly — no reset email.
  - There is no "forgot password" flow on the sign-in page, so no reset emails are generated.
  - If a reset/confirmation email were ever triggered, it would go out from the platform's default Lovable-owned sender, not vibrand.com. No sender domain is configured for this project.

## 2. Platform capabilities

- **Recommended: the platform's built-in managed email.** No provider account, no API key for you to manage — the platform credential is already in place. It handles delivery, retries, rate limits, bounce/complaint suppression and unsubscribe handling.
- **Where sends happen:** server-side only, from the existing server functions — the quote-submit function is already the right place. No new backend service or edge function needed; server code deploys with the app.
- **Alternatives:** Resend, SendGrid or Postmark if you prefer owning the provider account. Their API key would live in the encrypted secrets store (never in code, never in the frontend) and be read only inside server handlers. Raw SMTP is not viable — the server runtime is edge-based with no SMTP support; everything goes over HTTPS APIs.
- **Templates:** React-based email components rendered server-side, one file per email, registered so they can be previewed.
- **Limitations to know:**
  - File attachments are not supported with built-in sending — link to a signed download URL (e.g. the uploaded artwork) instead.
  - Hourly send allowance per plan; a burst beyond it returns a retry-after rather than failing. A non-issue at your volume.
  - Marketing/bulk email is not supported — only per-recipient event-triggered mail, which is exactly what these two are.
  - One recipient per send, so the staff notification goes to one configurable address; use a shared inbox/alias to reach several people.

## 3. Sending domain (quotes@vibrand.com)

With built-in sending, DNS is simpler than the usual SPF/DKIM/DMARC checklist:

- You delegate a **subdomain** (e.g. `notify.vibrand.com`) by adding **NS records** at your DNS provider. The platform then creates and maintains SPF, DKIM and MX inside that delegated zone — you never hand-add those records.
- The exact nameserver values are generated per domain and shown during setup; I won't guess them here.
- DMARC on the root domain stays yours: a `_dmarc.vibrand.com` TXT record, typically starting at `p=none` and tightening later.
- Propagation can take up to 72 hours, usually much less.
- **Before verification:** the two app emails below cannot send at all — there is no free or shared sender to fall back on. Only built-in auth emails fall back to the default platform sender. Domain verification is therefore a hard prerequisite.
- The visible From address can display as `quotes@vibrand.com` while the delegated subdomain does the technical signing.
- If you'd rather use Resend/SendGrid: you'd add their SPF TXT, DKIM CNAMEs and a verification record yourself, and pre-verification you'd be limited to their test sender, which only delivers to the account owner.

## 4. The two emails

Both hook into the **existing validated quote-submit server function**, after the quote request and its items insert successfully and after the honeypot and rate-limit guards — so bots and throttled requests never generate mail.

- **(a) Staff notification** — to a configurable address (a settings row or config value; single recipient, use an alias for a team). Contains customer name, company, email, phone, territory, message, the itemised list (SKU/name, quantity, notes), a link to the artwork if attached, and a link to the admin quote inbox.
- **(b) Customer confirmation** — to the submitted email: "we received your request", a summary of the items, and the 24-hour response expectation. No pricing.

Template approach: one React email component per email, brand-styled to match the site (charcoal/lime, inline styles, white body background), rendered server-side.

**Failure isolation — a failed email must never block or lose a submission:**
1. The database inserts happen and commit *first*; success no longer depends on email.
2. Each send is wrapped so any error is caught and logged, never rethrown — the function still returns success and the customer still sees the thank-you screen.
3. The two sends are independent: one failing does not stop the other.
4. Each send carries an idempotency key derived from the quote request id, so a retry cannot duplicate mail.
5. A suppressed recipient (previously bounced/unsubscribed) is a normal outcome — logged and skipped, not an error.
6. The admin quote inbox stays the source of truth; a missed email never means a missed quote. Delivery outcomes (sent, bounced, rejected, suppressed) are visible in the platform's email log.

## 5. Cost

- **Built-in platform email:** no separate provider bill. Sending draws on your existing plan allowance; under 500/month sits well inside it, so effectively no incremental cost.
- **Resend:** free tier covers 3,000 emails/month (100/day) — free at your volume; paid starts around $20/month.
- **SendGrid:** ~$20/month entry paid tier; no meaningful production free tier anymore.
- **Postmark:** ~$15/month for 10,000 emails; small free developer allowance.

At under 500/month, built-in sending or Resend's free tier both cost nothing extra. The one real prerequisite either way is delegating a sending subdomain of vibrand.com.