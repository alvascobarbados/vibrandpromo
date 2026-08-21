/**
 * One canonical builder for client-facing proposal share links.
 *
 * The saved `proposal_settings.public_base_url` ALWAYS wins so what sales
 * copies is what the client opens, regardless of the host the app runs on.
 * Empty setting falls back to the current origin (previous behaviour).
 */

/** Absolute http(s) only; trailing slashes stripped. Returns null when unusable. */
export function normalizePublicBaseUrl(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

/** `${public_base_url ?? window.location.origin}/p/${token}` */
export function proposalShareUrl(token: string, publicBaseUrl?: string | null): string {
  const base =
    normalizePublicBaseUrl(publicBaseUrl) ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/p/${token}`;
}
