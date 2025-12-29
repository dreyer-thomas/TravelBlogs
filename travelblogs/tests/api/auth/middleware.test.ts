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

describe("middleware", () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it("redirects unauthenticated users from protected routes", async () => {
    getToken.mockResolvedValue(null);
    const response = await middleware(makeRequest("/trips"));
    expect(response?.headers.get("location")).toBe(
      "http://localhost/sign-in?callbackUrl=%2Ftrips",
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
    expect(response?.headers.get("location")).toBe(
      "http://localhost/sign-in?callbackUrl=%2Fentries%2Fabc123",
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
    expect(response?.headers.get("location")).toBe(
      "http://localhost/sign-in?callbackUrl=%2Ftrips%2Fabc123",
    );
  });
});
