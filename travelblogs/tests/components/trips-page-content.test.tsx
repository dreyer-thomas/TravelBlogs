// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import TripsPageContent from "../../src/components/trips/trips-page-content";

const worldMapPropsSpy = vi.fn();

vi.mock("../../src/components/trips/world-map", () => ({
  default: (props: {
    ariaLabel: string;
    highlightedCountries?: string[];
    tripsByCountry?: Record<string, { id: string; title: string }[]>;
  }) => {
    worldMapPropsSpy(props);
    return <div data-testid="world-map" />;
  },
}));

vi.mock("../../src/components/account/user-menu", () => ({
  default: () => <div data-testid="user-menu" />,
}));

vi.mock("../../src/components/trips/trip-card", () => ({
  default: () => <div data-testid="trip-card" />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../../src/utils/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const baseProps = {
  trips: [],
  loadError: null,
  isViewer: true,
  isCreator: false,
  isAdmin: false,
  userName: "Viewer",
  userEmail: "viewer@example.com",
};

const originalFetch = globalThis.fetch;

describe("TripsPageContent", () => {
  afterEach(() => {
    worldMapPropsSpy.mockClear();
    vi.unstubAllGlobals();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as typeof globalThis & { fetch?: unknown }).fetch;
    }
  });

  it("passes tripsByCountry and highlightedCountries from world-map response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            countries: ["US"],
            tripsByCountry: {
              US: [{ id: "trip-1", title: "Pacific Coast" }],
            },
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<TripsPageContent {...baseProps} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/trips/world-map");
    });

    await waitFor(() => {
      const lastCall = worldMapPropsSpy.mock.calls.at(-1)?.[0];
      expect(lastCall?.highlightedCountries).toEqual(["US"]);
      expect(lastCall?.tripsByCountry).toEqual({
        US: [{ id: "trip-1", title: "Pacific Coast" }],
      });
    });
  });

  it("keeps the map visible even when the world-map fetch fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: null, error: null }), { status: 500 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<TripsPageContent {...baseProps} />);

    expect(screen.getByTestId("world-map")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/trips/world-map");
    });

    const lastCall = worldMapPropsSpy.mock.calls.at(-1)?.[0];
    expect(lastCall?.highlightedCountries).toEqual([]);
    expect(lastCall?.tripsByCountry).toBeUndefined();
  });
});
