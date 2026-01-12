// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import TripMap from "../../src/components/trips/trip-map";

const markerMock = vi.fn(() => ({
  addTo: vi.fn().mockReturnThis(),
  bindPopup: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  once: vi.fn().mockReturnThis(),
  openPopup: vi.fn(),
  closePopup: vi.fn(),
  remove: vi.fn(),
}));

const polylineMock = vi.fn(() => ({
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
}));

const mapMock = vi.fn(() => ({
  fitBounds: vi.fn().mockReturnThis(),
  remove: vi.fn(),
}));

const tileLayerMock = vi.fn(() => ({
  addTo: vi.fn(),
}));

const latLngBoundsMock = vi.fn(() => ({}));
const mergeOptionsMock = vi.fn();

// Mock Leaflet to avoid SSR and DOM issues in tests
vi.mock("leaflet", () => ({
  map: mapMock,
  tileLayer: tileLayerMock,
  marker: markerMock,
  polyline: polylineMock,
  latLngBounds: latLngBoundsMock,
  Icon: {
    Default: {
      mergeOptions: mergeOptionsMock,
    },
  },
}));

describe("TripMap", () => {
  const locations = [
    {
      entryId: "entry-1",
      title: "First stop",
      location: {
        latitude: 48.8566,
        longitude: 2.3522,
        label: "Paris",
      },
    },
    {
      entryId: "entry-2",
      title: "Second stop",
      location: {
        latitude: 51.5074,
        longitude: -0.1278,
        label: null,
      },
    },
  ];

  it("renders the map and initializes markers", async () => {
    render(
      <TripMap
        ariaLabel="Trip map"
        pinsLabel="Map pins"
        locations={locations}
        selectedEntryId="entry-2"
      />,
    );

    expect(screen.getByRole("region", { name: "Trip map" }))
      .toBeInTheDocument();
    await waitFor(() => expect(latLngBoundsMock).toHaveBeenCalled());
    expect(markerMock).toHaveBeenCalledTimes(2);
  });

  it("renders an empty state message when no locations exist", () => {
    markerMock.mockClear();
    render(
      <TripMap
        ariaLabel="Trip map"
        pinsLabel="Map pins"
        emptyMessage="No locations yet."
        locations={[]}
      />,
    );

    expect(screen.getByText("No locations yet.")).toBeInTheDocument();
    expect(markerMock).not.toHaveBeenCalled();
  });

  it("renders a chronological path line when 2+ locations with createdAt exist", async () => {
    polylineMock.mockClear();
    const locationsWithTimestamps = [
      {
        entryId: "entry-1",
        title: "Second stop",
        location: {
          latitude: 51.5074,
          longitude: -0.1278,
          label: "London",
        },
        createdAt: "2026-01-12T12:00:00Z",
      },
      {
        entryId: "entry-2",
        title: "First stop",
        location: {
          latitude: 48.8566,
          longitude: 2.3522,
          label: "Paris",
        },
        createdAt: "2026-01-11T10:00:00Z",
      },
      {
        entryId: "entry-3",
        title: "Third stop",
        location: {
          latitude: 52.5200,
          longitude: 13.4050,
          label: "Berlin",
        },
        createdAt: "2026-01-13T14:00:00Z",
      },
    ];

    render(
      <TripMap
        ariaLabel="Trip map"
        pinsLabel="Map pins"
        locations={locationsWithTimestamps}
      />,
    );

    await waitFor(() => {
      expect(polylineMock).toHaveBeenCalledWith(
        [
          [48.8566, 2.3522],  // Paris (oldest)
          [51.5074, -0.1278],  // London (middle)
          [52.5200, 13.4050],  // Berlin (newest)
        ],
        {
          color: "#1F6F78",
          weight: 2.5,
          opacity: 0.7,
          smoothFactor: 1.0,
          lineJoin: "round",
          lineCap: "round",
        },
      );
    });
  });

  it("does not render a path line when only 1 location exists", async () => {
    polylineMock.mockClear();
    const singleLocation = [
      {
        entryId: "entry-1",
        title: "Single stop",
        location: {
          latitude: 48.8566,
          longitude: 2.3522,
          label: "Paris",
        },
        createdAt: "2026-01-11T10:00:00Z",
      },
    ];

    render(
      <TripMap
        ariaLabel="Trip map"
        pinsLabel="Map pins"
        locations={singleLocation}
      />,
    );

    await waitFor(() => expect(markerMock).toHaveBeenCalled());
    expect(polylineMock).not.toHaveBeenCalled();
  });

  it("handles locations without createdAt gracefully", async () => {
    polylineMock.mockClear();
    const locationsWithoutTimestamps = [
      {
        entryId: "entry-1",
        title: "First stop",
        location: {
          latitude: 48.8566,
          longitude: 2.3522,
          label: "Paris",
        },
      },
      {
        entryId: "entry-2",
        title: "Second stop",
        location: {
          latitude: 51.5074,
          longitude: -0.1278,
          label: "London",
        },
      },
    ];

    render(
      <TripMap
        ariaLabel="Trip map"
        pinsLabel="Map pins"
        locations={locationsWithoutTimestamps}
      />,
    );

    // Should still render polyline even without timestamps (uses insertion order)
    await waitFor(() => {
      expect(polylineMock).toHaveBeenCalledWith(
        [
          [48.8566, 2.3522],
          [51.5074, -0.1278],
        ],
        expect.objectContaining({
          color: "#1F6F78",
          weight: 2.5,
          opacity: 0.7,
        }),
      );
    });
  });

  it("sorts entries with mixed timestamps correctly (timestamped first, then non-timestamped)", async () => {
    polylineMock.mockClear();
    const mixedTimestamps = [
      {
        entryId: "entry-3",
        title: "No timestamp stop",
        location: {
          latitude: 52.5200,
          longitude: 13.4050,
          label: "Berlin",
        },
      },
      {
        entryId: "entry-1",
        title: "Middle stop",
        location: {
          latitude: 48.8566,
          longitude: 2.3522,
          label: "Paris",
        },
        createdAt: "2026-01-12T12:00:00Z",
      },
      {
        entryId: "entry-2",
        title: "Earliest stop",
        location: {
          latitude: 51.5074,
          longitude: -0.1278,
          label: "London",
        },
        createdAt: "2026-01-11T10:00:00Z",
      },
    ];

    render(
      <TripMap
        ariaLabel="Trip map"
        pinsLabel="Map pins"
        locations={mixedTimestamps}
      />,
    );

    // Should order: London (earliest timestamp), Paris (later timestamp), Berlin (no timestamp goes to end)
    await waitFor(() => {
      expect(polylineMock).toHaveBeenCalledWith(
        [
          [51.5074, -0.1278],  // London (earliest timestamp)
          [48.8566, 2.3522],   // Paris (middle timestamp)
          [52.5200, 13.4050],  // Berlin (no timestamp, goes to end)
        ],
        expect.objectContaining({
          color: "#1F6F78",
        }),
      );
    });
  });
});
