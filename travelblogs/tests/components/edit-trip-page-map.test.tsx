// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LocaleProvider } from "../../src/utils/locale-context";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { fill, unoptimized, priority, ...rest } = props;
    return (
      <img
        {...rest}
        data-fill={fill ? "true" : undefined}
        data-unoptimized={unoptimized ? "true" : undefined}
        data-priority={priority ? "true" : undefined}
      />
    );
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Import actual component
import TripDetail from "../../src/components/trips/trip-detail";

describe("TripDetail - Map Integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("renders map panel and entry list with same layout as shared viewer", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "trip-1",
              title: "Mountain Trek",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-08T00:00:00.000Z",
              coverImageUrl: null,
            },
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "entry-1",
                tripId: "trip-1",
                title: "Base camp",
                createdAt: "2025-06-02T12:00:00.000Z",
                coverImageUrl: "/uploads/entries/base.jpg",
                media: [{ url: "/uploads/entries/base.jpg" }],
                text: "Base camp setup.",
              },
            ],
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              trip: {
                id: "trip-1",
                title: "Mountain Trek",
                startDate: "2025-06-01T00:00:00.000Z",
                endDate: "2025-06-08T00:00:00.000Z",
                coverImageUrl: null,
              },
              entries: [
                {
                  id: "entry-1",
                  tripId: "trip-1",
                  title: "Base camp",
                  createdAt: "2025-06-02T12:00:00.000Z",
                  coverImageUrl: "/uploads/entries/base.jpg",
                  media: [{ url: "/uploads/entries/base.jpg" }],
                  location: {
                    latitude: 48.8566,
                    longitude: 2.3522,
                    label: "Paris",
                  },
                },
              ],
            },
            error: null,
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", mockFetch);

    render(
      <LocaleProvider>
        <TripDetail
          tripId="trip-1"
          canAddEntry={true}
          canEditTrip={true}
          canDeleteTrip={true}
          canManageShare={true}
          canManageViewers={true}
          canTransferOwnership={true}
        />
      </LocaleProvider>,
    );

    expect(await screen.findByText("Base camp")).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: /map/i })).toBeInTheDocument();
  });

  it("renders empty state message when trip has no entry locations", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
            data: {
              id: "trip-2",
              title: "City Tour",
              startDate: "2025-07-01T00:00:00.000Z",
              endDate: "2025-07-05T00:00:00.000Z",
              coverImageUrl: null,
            },
            error: null,
          }), { status: 200 }));

    // Mock entries fetch with one entry
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
            data: [
              {
                id: "entry-2",
                tripId: "trip-2",
                title: "Day one",
                createdAt: "2025-07-01T12:00:00.000Z",
                coverImageUrl: "/uploads/entries/day-one.jpg",
                media: [{ url: "/uploads/entries/day-one.jpg" }],
                text: "First day of the trip",
              },
            ],
            error: null,
          }), { status: 200 }));

    // Mock overview fetch without location data
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
            data: {
              trip: {
                id: "trip-2",
                title: "City Tour",
                startDate: "2025-07-01T00:00:00.000Z",
                endDate: "2025-07-05T00:00:00.000Z",
                coverImageUrl: null,
              },
              entries: [
                {
                  id: "entry-2",
                  tripId: "trip-2",
                  title: "Day one",
                  createdAt: "2025-07-01T12:00:00.000Z",
                  coverImageUrl: "/uploads/entries/day-one.jpg",
                  media: [{ url: "/uploads/entries/day-one.jpg" }],
                  location: null,
                },
              ],
            },
            error: null,
          }), { status: 200 }));

    vi.stubGlobal("fetch", mockFetch);

    render(
      <LocaleProvider>
        <TripDetail
          tripId="trip-2"
          canAddEntry={true}
          canEditTrip={true}
          canDeleteTrip={true}
          canManageShare={true}
          canManageViewers={true}
          canTransferOwnership={true}
        />
      </LocaleProvider>,
    );

    // Map shows empty state when no locations, but entry list shows the entry
    expect(await screen.findByText("No locations yet. Entries appear once coordinates are available.")).toBeInTheDocument();
    expect(await screen.findByText("Day one")).toBeInTheDocument();
  });

  it("highlights corresponding entry when map pin is selected", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
            data: {
              id: "trip-3",
              title: "Island hopping",
              startDate: "2025-08-01T00:00:00.000Z",
              endDate: "2025-08-10T00:00:00.000Z",
              coverImageUrl: null,
            },
            error: null,
          }), { status: 200 }));

    // Mock entries fetch with two entries
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
            data: [
              {
                id: "entry-a",
                tripId: "trip-3",
                title: "First island",
                createdAt: "2025-08-02T12:00:00.000Z",
                coverImageUrl: "/uploads/entries/island-a.jpg",
                media: [{ url: "/uploads/entries/island-a.jpg" }],
                text: "First island visit",
              },
              {
                id: "entry-b",
                tripId: "trip-3",
                title: "Second island",
                createdAt: "2025-08-03T12:00:00.000Z",
                coverImageUrl: "/uploads/entries/island-b.jpg",
                media: [{ url: "/uploads/entries/island-b.jpg" }],
                text: "Second island visit",
              },
            ],
            error: null,
          }), { status: 200 }));

    // Mock overview fetch with multiple entries
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
            data: {
              trip: {
                id: "trip-3",
                title: "Island hopping",
                startDate: "2025-08-01T00:00:00.000Z",
                endDate: "2025-08-10T00:00:00.000Z",
                coverImageUrl: null,
              },
              entries: [
                {
                  id: "entry-a",
                  tripId: "trip-3",
                  title: "First island",
                  createdAt: "2025-08-02T12:00:00.000Z",
                  coverImageUrl: "/uploads/entries/island-a.jpg",
                  media: [{ url: "/uploads/entries/island-a.jpg" }],
                  location: {
                    latitude: 48.8566,
                    longitude: 2.3522,
                    label: "Paris",
                  },
                },
                {
                  id: "entry-b",
                  tripId: "trip-3",
                  title: "Second island",
                  createdAt: "2025-08-03T12:00:00.000Z",
                  coverImageUrl: "/uploads/entries/island-b.jpg",
                  media: [{ url: "/uploads/entries/island-b.jpg" }],
                  location: {
                    latitude: 51.5074,
                    longitude: -0.1278,
                    label: "London",
                  },
                },
              ],
            },
            error: null,
          }), { status: 200 }));

    vi.stubGlobal("fetch", mockFetch);

    render(
      <LocaleProvider>
        <TripDetail
          tripId="trip-3"
          canAddEntry={true}
          canEditTrip={true}
          canDeleteTrip={true}
          canManageShare={true}
          canManageViewers={true}
          canTransferOwnership={true}
        />
      </LocaleProvider>,
    );

    const pin = await screen.findByRole("button", { name: "Second island" });
    fireEvent.click(pin);

    const entryCards = screen.getAllByText("Second island");
    const entryCard = entryCards.find((el) => el.closest('[aria-current="true"]'));
    expect(entryCard).toBeDefined();
  });
});
