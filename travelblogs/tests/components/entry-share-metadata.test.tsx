import { afterEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

const tripApiResponse = () =>
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
  );

describe("entry share generateMetadata", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockHeaders = () => {
    headersMock.mockResolvedValue(
      new Headers({ host: "localhost", "accept-language": "en-US" }),
    );
  };

  it("uses the entry's title with the trip's title as byline for a valid token", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/entries/")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "entry-1",
                tripId: "trip-1",
                title: "Rainy afternoon",
                text: "Warm cafes.",
                createdAt: "2025-06-02T00:00:00.000Z",
                coverImageUrl: null,
                media: [],
              },
              error: null,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(tripApiResponse());
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateMetadata } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/page"
    );

    const metadata = await generateMetadata({
      params: { token: "token-1", entryId: "entry-1" },
    });

    expect(metadata.title).toBe("Rainy afternoon — Alpine Adventure");
    expect(metadata.description).toContain("Rainy afternoon");
    expect(metadata.description).toContain("Alpine Adventure");
    expect(metadata.openGraph?.title).toBe("Rainy afternoon — Alpine Adventure");
    expect(metadata.twitter?.title).toBe("Rainy afternoon — Alpine Adventure");
  });

  it("falls back to generic site metadata and leaks no data for an invalid token/entry", async () => {
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
      "../../src/app/trips/share/[token]/entries/[entryId]/page"
    );

    const metadata = await generateMetadata({
      params: { token: "revoked-token", entryId: "entry-1" },
    });

    expect(metadata.title).toBe("TravelBlogs");
    expect(metadata.description).toBe(
      "Media-first travel stories with private sharing.",
    );
    expect(JSON.stringify(metadata)).not.toContain("revoked-token");
  });
});
