import { afterEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

describe("trip share generateMetadata", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockHeaders = () => {
    headersMock.mockResolvedValue(
      new Headers({ host: "localhost", "accept-language": "en-US" }),
    );
  };

  it("uses the trip's own title and description for a valid token", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            trip: {
              id: "trip-1",
              title: "Alpine Adventure",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-08T00:00:00.000Z",
              coverImageUrl: null,
            },
            entries: [],
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { generateMetadata } = await import(
      "../../src/app/trips/share/[token]/page"
    );

    const metadata = await generateMetadata({ params: { token: "token-1" } });

    expect(metadata.title).toBe("Alpine Adventure");
    expect(metadata.description).toContain("Alpine Adventure");
    expect(metadata.openGraph?.title).toBe("Alpine Adventure");
    expect(metadata.twitter?.title).toBe("Alpine Adventure");
  });

  it("falls back to generic site metadata and leaks no data for an invalid token", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: "NOT_FOUND", message: "Share link not found." },
        }),
        { status: 404 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { generateMetadata } = await import(
      "../../src/app/trips/share/[token]/page"
    );

    const metadata = await generateMetadata({
      params: { token: "revoked-token" },
    });

    expect(metadata.title).toBe("TravelBlogs");
    expect(metadata.description).toBe(
      "Media-first travel stories with private sharing.",
    );
    expect(JSON.stringify(metadata)).not.toContain("revoked-token");
  });
});
