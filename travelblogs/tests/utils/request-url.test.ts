import { describe, expect, it } from "vitest";
import { parseRequestUrl } from "../../server.js";

describe("parseRequestUrl", () => {
  it("splits pathname and query for a simple request target", () => {
    const parsed = parseRequestUrl("/trips?b=x");
    expect(parsed.pathname).toBe("/trips");
    expect(parsed.query).toEqual({ b: "x" });
    expect(parsed.search).toBe("?b=x");
  });

  it("collects repeated query keys into an array, matching url.parse", () => {
    const parsed = parseRequestUrl("/trips?a=1&a=2&b=x");
    expect(parsed.query).toEqual({ a: ["1", "2"], b: "x" });
    expect(parsed.path).toBe("/trips?a=1&a=2&b=x");
    expect(parsed.href).toBe("/trips?a=1&a=2&b=x");
  });

  it("reports a null search and empty query when there is no query string", () => {
    const parsed = parseRequestUrl("/trips");
    expect(parsed.pathname).toBe("/trips");
    expect(parsed.search).toBeNull();
    expect(parsed.query).toEqual({});
  });

  it("decodes percent-encoded query values", () => {
    const parsed = parseRequestUrl("/trips?token=a%20b%26c");
    expect(parsed.query).toEqual({ token: "a b&c" });
  });

  it("keeps a protocol-relative target in the pathname instead of treating it as a host", () => {
    const parsed = parseRequestUrl("//evil.com/p");
    expect(parsed.pathname).toBe("//evil.com/p");
    expect(parsed.query).toEqual({});
  });

  it("preserves shared-link routes with tokens", () => {
    const parsed = parseRequestUrl("/trips/share/abc123/entries/xyz789");
    expect(parsed.pathname).toBe("/trips/share/abc123/entries/xyz789");
  });

  it("falls back to the root path for an empty or missing target", () => {
    expect(parseRequestUrl("").pathname).toBe("/");
    expect(parseRequestUrl(undefined).pathname).toBe("/");
  });

  it("does not emit the url.parse deprecation warning", () => {
    const warnings: string[] = [];
    const onWarning = (warning: Error & { code?: string }) => {
      if (warning.code) {
        warnings.push(warning.code);
      }
    };
    process.on("warning", onWarning);
    try {
      parseRequestUrl("/trips?a=1");
    } finally {
      process.off("warning", onWarning);
    }
    expect(warnings).not.toContain("DEP0169");
  });
});
