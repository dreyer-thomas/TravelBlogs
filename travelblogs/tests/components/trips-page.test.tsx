import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const redirect = vi.fn();
const getServerSession = vi.fn();

vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/trips",
}));

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () =>
    new Headers({
      host: "localhost:3000",
    }),
}));

describe("Trips page viewer experience", () => {
  beforeEach(() => {
    redirect.mockReset();
    getServerSession.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders viewer trips without creator actions", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "viewer-1", role: "viewer" },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "trip-1",
              title: "Invited Adventure",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-05T00:00:00.000Z",
              coverImageUrl: null,
              updatedAt: "2025-05-06T00:00:00.000Z",
              canEditTrip: false,
            },
          ],
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pageModule = await import("../../src/app/trips/page");
    const element = await pageModule.default();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Your trips");
    expect(html).toContain("Invited Adventure");
    expect(html).not.toContain("Manage users");
    expect(html).not.toContain("Create trip");
  });

  it("renders viewer empty state copy without create actions", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "viewer-2", role: "viewer" },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pageModule = await import("../../src/app/trips/page");
    const element = await pageModule.default();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("No invited trips yet");
    expect(html).toContain(
      "When someone invites you to a trip, it will show up here.",
    );
    expect(html).not.toContain("Create a trip");
    expect(html).not.toContain("Create trip");
  });

  it("shows admin controls in trips page", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "admin-1", role: "administrator", email: "admin@example.com" },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "trip-99",
              title: "All Trips",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-05T00:00:00.000Z",
              coverImageUrl: null,
              updatedAt: "2025-05-06T00:00:00.000Z",
              canEditTrip: true,
            },
          ],
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pageModule = await import("../../src/app/trips/page");
    const element = await pageModule.default();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Manage trips");
    expect(html).toContain("Manage users");
    expect(html).toContain("Create trip");
  });

  it("renders an access warning for unknown roles", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "mystery-user", role: "admin" },
    });

    const pageModule = await import("../../src/app/trips/page");
    const element = await pageModule.default();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Your account does not have access to trips.");
    expect(html).toContain("Access to this area is restricted.");
  });
});
