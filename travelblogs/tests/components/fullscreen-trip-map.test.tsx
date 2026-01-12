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

describe("FullscreenTripMap", () => {
  beforeEach(() => {
    latLngBoundsMock.mockClear();
    markerMock.mockClear();
    mapMock.mockClear();
    polylineMock.mockClear();
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

  it("renders chronological path line for entries with createdAt", async () => {
    render(
      <FullscreenTripMap
        tripTitle="Path Test Trip"
        entries={[
          {
            id: "entry-2",
            title: "Second stop",
            coverImageUrl: "/cover2.jpg",
            media: [],
            location: {
              latitude: 51.5074,
              longitude: -0.1278,
              label: "London",
            },
            createdAt: "2026-01-12T12:00:00Z",
          },
          {
            id: "entry-1",
            title: "First stop",
            coverImageUrl: "/cover1.jpg",
            media: [],
            location: {
              latitude: 48.8566,
              longitude: 2.3522,
              label: "Paris",
            },
            createdAt: "2026-01-11T10:00:00Z",
          },
        ]}
        entryLinkBase="/entries"
        mapLabel="Trip map"
        pinsLabel="Map pins"
        emptyMessage="No locations"
      />,
    );

    await waitFor(() => {
      expect(polylineMock).toHaveBeenCalledWith(
        [
          [48.8566, 2.3522],  // Paris (oldest)
          [51.5074, -0.1278],  // London (newest)
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

  it("does not render path line for single entry", async () => {
    render(
      <FullscreenTripMap
        tripTitle="Single Entry Trip"
        entries={[
          {
            id: "entry-1",
            title: "Only stop",
            coverImageUrl: "/cover.jpg",
            media: [],
            location: {
              latitude: 48.8566,
              longitude: 2.3522,
              label: "Paris",
            },
            createdAt: "2026-01-11T10:00:00Z",
          },
        ]}
        entryLinkBase="/entries"
        mapLabel="Trip map"
        pinsLabel="Map pins"
        emptyMessage="No locations"
      />,
    );

    await waitFor(() => expect(markerMock).toHaveBeenCalled());
    expect(polylineMock).not.toHaveBeenCalled();
  });
});
