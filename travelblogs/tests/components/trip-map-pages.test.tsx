import { afterEach, describe, expect, it, vi } from "vitest";

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () =>
    new Headers({
      host: "localhost",
      "x-forwarded-proto": "http",
      "accept-language": "en",
    }),
}));

vi.mock("../../src/components/trips/shared-trip-guard", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Trip map routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    notFoundMock.mockClear();
  });

  it("requests the shared trip overview for the map view", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            trip: {
              id: "trip-1",
              title: "Shared Trip",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-05T00:00:00.000Z",
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

    const { default: SharedTripMapPage } = await import(
      "../../src/app/trips/share/[token]/map/page"
    );

    await SharedTripMapPage({ params: { token: "token-1" } });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/api/trips/share/token-1",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
  });

  it("calls notFound for revoked shared map tokens", async () => {
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

    const { default: SharedTripMapPage } = await import(
      "../../src/app/trips/share/[token]/map/page"
    );

    await expect(
      SharedTripMapPage({ params: { token: "revoked-token" } }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("requests the signed-in trip overview for the map view", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            trip: {
              id: "trip-2",
              title: "Signed Trip",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-05T00:00:00.000Z",
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

    const { default: TripMapPage } = await import(
      "../../src/app/trips/[tripId]/map/page"
    );

    await TripMapPage({ params: { tripId: "trip-2" } });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/api/trips/trip-2/overview",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
  });

  it("calls notFound for missing signed-in trip map", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: "NOT_FOUND", message: "Trip not found." },
        }),
        { status: 404 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { default: TripMapPage } = await import(
      "../../src/app/trips/[tripId]/map/page"
    );

    await expect(
      TripMapPage({ params: { tripId: "trip-missing" } }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });
});
