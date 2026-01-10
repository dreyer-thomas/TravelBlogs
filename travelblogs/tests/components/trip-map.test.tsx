// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import TripMap from "../../src/components/trips/trip-map";

// Mock Leaflet to avoid SSR and DOM issues in tests
vi.mock("leaflet", () => ({
  default: {
    map: vi.fn(() => ({
      fitBounds: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn(),
    })),
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      openPopup: vi.fn(),
      closePopup: vi.fn(),
      remove: vi.fn(),
    })),
    latLngBounds: vi.fn(() => ({})),
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

  it("renders pins with labels and highlights the selected entry", () => {
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
    const selected = screen.getByRole("button", { name: "Second stop" });
    expect(selected).toHaveAttribute("aria-pressed", "true");
  });

  it("notifies when a pin is selected", () => {
    const onSelectEntry = vi.fn();

    render(
      <TripMap
        ariaLabel="Trip map"
        pinsLabel="Map pins"
        locations={locations}
        onSelectEntry={onSelectEntry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "First stop" }));

    expect(onSelectEntry).toHaveBeenCalledWith("entry-1");
  });

  it("renders an empty state message when no locations exist", () => {
    render(
      <TripMap
        ariaLabel="Trip map"
        pinsLabel="Map pins"
        emptyMessage="No locations yet."
        locations={[]}
      />,
    );

    expect(screen.getByText("No locations yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
