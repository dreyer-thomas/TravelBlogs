import { describe, expect, it, vi, beforeEach } from "vitest";

const redirect = vi.fn();
const getServerSession = vi.fn();

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () => new Headers(),
}));

describe("Admin users page access", () => {
  beforeEach(() => {
    redirect.mockReset();
    getServerSession.mockReset();
  });

  it("redirects non-admin sessions", async () => {
    getServerSession.mockResolvedValue({ user: { id: "viewer" } });

    const pageModule = await import("../../../src/app/admin/users/page");
    await pageModule.default();

    expect(redirect).toHaveBeenCalledWith("/trips");
  });

  it("redirects unauthenticated sessions to sign-in", async () => {
    getServerSession.mockResolvedValue(null);

    const pageModule = await import("../../../src/app/admin/users/page");
    await pageModule.default();

    expect(redirect).toHaveBeenCalledWith("/sign-in?callbackUrl=/admin/users");
  });
});
