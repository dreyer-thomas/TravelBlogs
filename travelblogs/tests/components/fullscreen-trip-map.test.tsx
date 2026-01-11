// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import FullscreenTripMap from "../../src/components/trips/fullscreen-trip-map";

const popupContents: string[] = [];

const markerMock = vi.fn(() => {
  const bindPopup = vi.fn((content: string) => {
    popupContents.push(content);
    return marker;
  });
  const marker = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup,
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    openPopup: vi.fn(),
    closePopup: vi.fn(),
    remove: vi.fn(),
  };
  return marker;
});

const mapMock = vi.fn(() => ({
  fitBounds: vi.fn().mockReturnThis(),
  remove: vi.fn(),
}));

const tileLayerMock = vi.fn(() => ({
  addTo: vi.fn(),
}));

const latLngBoundsMock = vi.fn(() => ({}));
const mergeOptionsMock = vi.fn();

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

describe("FullscreenTripMap", () => {
  beforeEach(() => {
    latLngBoundsMock.mockClear();
    markerMock.mockClear();
    mapMock.mockClear();
    popupContents.length = 0;
  });
  it("renders popup content with hero image, title, and entry link", async () => {
    render(
      <FullscreenTripMap
        tripTitle="Atlas Adventure"
        entries={[
          {
            id: "entry-1",
            title: "First stop",
            coverImageUrl: "https://example.com/cover.jpg",
            media: [{ url: "https://example.com/media.jpg" }],
            location: {
              latitude: 48.8566,
              longitude: 2.3522,
              label: "Paris",
            },
          },
        ]}
        entryLinkBase="/entries"
        mapLabel="Trip map"
        pinsLabel="Map pins"
        emptyMessage="No locations"
      />,
    );

    await waitFor(() => expect(latLngBoundsMock).toHaveBeenCalled());

    expect(popupContents[0]).toContain("https://example.com/cover.jpg");
    expect(popupContents[0]).toContain("First stop");
    expect(popupContents[0]).toContain("/entries/entry-1");
  });

  it("renders empty state when no entries have locations", () => {
    const { getByText } = render(
      <FullscreenTripMap
        tripTitle="Empty Trip"
        entries={[]}
        entryLinkBase="/entries"
        mapLabel="Trip map"
        pinsLabel="Map pins"
        emptyMessage="No locations available"
      />,
    );

    expect(getByText("No locations available")).toBeInTheDocument();
    expect(latLngBoundsMock).not.toHaveBeenCalled();
  });
});
