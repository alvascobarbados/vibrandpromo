import { describe, expect, it } from "vitest";

import { normalizePublicBaseUrl, proposalShareUrl } from "@/lib/proposal-share";

describe("normalizePublicBaseUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizePublicBaseUrl("https://vibrand.com/")).toBe("https://vibrand.com");
    expect(normalizePublicBaseUrl("https://vibrand.com///")).toBe("https://vibrand.com");
  });
  it("rejects values without an http(s) scheme", () => {
    expect(normalizePublicBaseUrl("vibrand.com")).toBeNull();
    expect(normalizePublicBaseUrl("ftp://vibrand.com")).toBeNull();
    expect(normalizePublicBaseUrl("")).toBeNull();
    expect(normalizePublicBaseUrl(null)).toBeNull();
  });
});

describe("proposalShareUrl", () => {
  it("prefers the configured base url", () => {
    expect(proposalShareUrl("abc", "https://vibrand.com/")).toBe("https://vibrand.com/p/abc");
  });
  it("falls back to the current origin when empty", () => {
    const origin = "https://preview.example";
    (globalThis as { window?: unknown }).window = { location: { origin } };
    expect(proposalShareUrl("abc", null)).toBe(`${origin}/p/abc`);
    delete (globalThis as { window?: unknown }).window;
  });
});
