import { getRequestHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Single source of truth for per-visitor rate limiting.
 * Used by the quote submit function and by artwork upload token issuance.
 */
export async function requestIpHash() {
  const forwarded = getRequestHeader("x-forwarded-for") ?? "";
  const ip =
    (forwarded.split(",")[0] ?? "").trim() || getRequestHeader("cf-connecting-ip") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Counts rows for this ip hash inside the trailing one-hour window. */
export async function countRecent(
  client: SupabaseClient<any, any, any>,
  table: "quote_submission_log" | "artwork_token_log",
  ipHash: string,
) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  return { count: count ?? 0, error };
}

export async function logAttempt(
  client: SupabaseClient<any, any, any>,
  table: "quote_submission_log" | "artwork_token_log",
  ipHash: string,
) {
  await client.from(table).insert({ ip_hash: ipHash });
}
