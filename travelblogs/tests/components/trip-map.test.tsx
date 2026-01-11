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
});
