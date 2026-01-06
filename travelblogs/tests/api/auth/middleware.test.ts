import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

import { middleware } from "../../../src/middleware";

const makeRequest = (path: string) => {
  return new NextRequest(new Request(`http://localhost${path}`));
};

const normalizeLocation = (location: string | null) => {
  if (!location) {
    return null;
  }
  const parsed = new URL(location, "http://localhost");
  return `${parsed.pathname}${parsed.search}`;
};

describe("middleware", () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it("redirects unauthenticated users from protected routes", async () => {
    getToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/trips"));
    expect(normalizeLocation(response?.headers.get("location") ?? null)).toBe(
      "/sign-in?callbackUrl=%2Ftrips",
    );
  });

  it("allows authenticated users through protected routes", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const response = await middleware(makeRequest("/trips"));
    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects unauthenticated users from entry routes", async () => {
    getToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/entries/abc123"));
    expect(normalizeLocation(response?.headers.get("location") ?? null)).toBe(
      "/sign-in?callbackUrl=%2Fentries%2Fabc123",
    );
  });

  it("allows public access to shareable trip routes", async () => {
    getToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/trips/share/abc123"));
    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows public access to shared entry routes", async () => {
    getToken.mockResolvedValue(null);
    const response = await middleware(
      makeRequest("/trips/share/abc123/entries/entry-1"),
    );
    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects unauthenticated users from trip management routes", async () => {
    getToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/trips/abc123"));
    expect(normalizeLocation(response?.headers.get("location") ?? null)).toBe(
      "/sign-in?callbackUrl=%2Ftrips%2Fabc123",
    );
  });

  it("redirects must-change users to the password page", async () => {
    getToken.mockResolvedValue({ sub: "viewer", mustChangePassword: true });
    const response = await middleware(makeRequest("/trips"));
    expect(normalizeLocation(response?.headers.get("location") ?? null)).toBe(
      "/account/password?callbackUrl=%2Ftrips",
    );
  });

  it("allows must-change users to access the password page", async () => {
    getToken.mockResolvedValue({ sub: "viewer", mustChangePassword: true });
    const response = await middleware(makeRequest("/account/password"));
    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects must-change users away from protected APIs", async () => {
    getToken.mockResolvedValue({ sub: "viewer", mustChangePassword: true });
    const response = await middleware(makeRequest("/api/trips?view=all"));
    expect(normalizeLocation(response?.headers.get("location") ?? null)).toBe(
      "/account/password?callbackUrl=%2Fapi%2Ftrips%3Fview%3Dall",
    );
  });

  it("allows must-change users to reach auth APIs", async () => {
    getToken.mockResolvedValue({ sub: "viewer", mustChangePassword: true });
    const response = await middleware(makeRequest("/api/auth/session"));
    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows must-change users to reach password update API", async () => {
    getToken.mockResolvedValue({ sub: "viewer", mustChangePassword: true });
    const response = await middleware(
      makeRequest("/api/users/user-1/password"),
    );
    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });

  it("preserves query params in callbackUrl", async () => {
    getToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/trips?source=share"));
    expect(normalizeLocation(response?.headers.get("location") ?? null)).toBe(
      "/sign-in?callbackUrl=%2Ftrips%3Fsource%3Dshare",
    );
  });
});
