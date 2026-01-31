// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LocaleProvider } from "../../src/utils/locale-context";

const mapMock = vi.fn(() => ({
  setView: vi.fn().mockReturnThis(),
  remove: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

const geoJsonMock = vi.fn(() => ({
  addTo: vi.fn().mockReturnThis(),
  setStyle: vi.fn().mockReturnThis(),
}));

const mergeOptionsMock = vi.fn();
const stopPropagationMock = vi.fn();
const leafletModule = {
  map: mapMock,
  geoJSON: geoJsonMock,
  DomEvent: {
    stopPropagation: stopPropagationMock,
  },
  Icon: {
    Default: {
      mergeOptions: mergeOptionsMock,
    },
  },
};
const leafletLoader = () => Promise.resolve(leafletModule as never);
const createLayerMock = () => {
  const handlers: Record<string, (event?: unknown) => void> = {};
  return {
    on: vi.fn((nextHandlers: Record<string, (event?: unknown) => void>) => {
      Object.assign(handlers, nextHandlers);
    }),
    handlers,
  };
};

const originalFetch = globalThis.fetch;
const originalMatchMedia = window.matchMedia;
let WorldMap: (props: {
  ariaLabel: string;
  highlightedCountries?: string[];
  leafletLoader?: () => Promise<never>;
}) => JSX.Element;

describe("WorldMap", () => {
  beforeEach(async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            type: "FeatureCollection",
            features: [],
          }),
      }),
    ) as typeof fetch;
    geoJsonMock.mockClear();
    mapMock.mockClear();
    mergeOptionsMock.mockClear();
    stopPropagationMock.mockClear();
    const worldMapModule = await import("../../src/components/trips/world-map");
    WorldMap = worldMapModule.default;
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as typeof globalThis & { fetch?: unknown }).fetch;
    }
    window.matchMedia = originalMatchMedia;
    vi.useRealTimers();
  });

  it("renders the map container with accessible label", () => {
    render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    const mapRegion = screen.getByRole("region", { name: "World map" });
    expect(mapRegion).toBeDefined();
  });

  it("has white background for ocean blending", () => {
    const { container } = render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    const mapContainer = container.querySelector('[role="region"]');
    expect(mapContainer).toBeDefined();
    expect(mapContainer?.className).toContain("bg-white");
  });

  it("renders with correct styling", () => {
    const { container } = render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    const mapContainer = container.querySelector('[role="region"]');
    expect(mapContainer?.className).toContain("w-full");
    expect(mapContainer?.className).toContain("relative");
  });

  it("has rounded corners for visual consistency", () => {
    const { container } = render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    const outerWrapper = container.firstElementChild;
    expect(outerWrapper?.className).toContain("rounded-2xl");
  });

  it("initializes the map with the finalized zoom and latitude settings", async () => {
    render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(mapMock).toHaveBeenCalled();
    });

    const mapInstance = mapMock.mock.results[0]?.value;
    expect(mapInstance?.setView).toHaveBeenCalledWith([33, 0], 1.55);
  });

  it("initializes the map with zoom controls, dragging, and touch zoom enabled", async () => {
    render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(mapMock).toHaveBeenCalled();
    });

    const mapOptions = mapMock.mock.calls[0]?.[1];
    expect(mapOptions?.zoomControl).toBe(true);
    expect(mapOptions?.dragging).toBe(true);
    expect(mapOptions?.touchZoom).toBe(true);
  });

  it("keeps scroll wheel zoom disabled to avoid page scroll capture", async () => {
    render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(mapMock).toHaveBeenCalled();
    });

    const mapOptions = mapMock.mock.calls[0]?.[1];
    expect(mapOptions?.scrollWheelZoom).toBe(false);
  });

  it("sets zoomSnap to 0.1 for fractional snapping and zoomDelta to 1 for full-level zoom buttons", async () => {
    render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(mapMock).toHaveBeenCalled();
    });

    const mapOptions = mapMock.mock.calls[0]?.[1];
    expect(mapOptions?.zoomSnap).toBe(0.1);
    expect(mapOptions?.zoomDelta).toBe(1);
  });

  it("uses aspect ratio for responsive map sizing", () => {
    render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" leafletLoader={leafletLoader} />
      </LocaleProvider>,
    );

    const mapRegion = screen.getByRole("region", { name: "World map" });
    expect(mapRegion).toBeDefined();
    expect(mapRegion.classList.contains("aspect-[2/1]")).toBe(true);
  });

  it("renders popup above the map with elevated z-index on click", async () => {
    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          tripsByCountry={{
            US: [{ id: "trip-1", title: "Pacific Coast" }],
          }}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const mapRegion = screen.getByRole("region", { name: "World map" });
    Object.defineProperty(mapRegion, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const layer = createLayerMock();
    options?.onEachFeature?.(
      { properties: { "ISO3166-1-Alpha-2": "US" } },
      layer,
    );

    layer.handlers.click?.({
      originalEvent: new MouseEvent("mousemove", {
        clientX: 40,
        clientY: 30,
      }),
    });

    const popup = await screen.findByTestId("world-map-hover-popup");
    expect(popup.className).toContain("z-[1000]");
  });

  it("applies latitude gradient styling for highlighted countries", async () => {
    const highlightedCountries = ["US"];

    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={highlightedCountries}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const style = options?.style;

    expect(typeof style).toBe("function");
    const northPoleStyle = style({
      properties: { "ISO3166-1-Alpha-2": "US" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 90],
            [1, 90],
            [1, 90],
            [0, 90],
            [0, 90],
          ],
        ],
      },
    });
    const equatorStyle = style({
      properties: { "ISO3166-1-Alpha-2": "US" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 0],
            [0, 0],
            [0, 0],
          ],
        ],
      },
    });

    expect(northPoleStyle.fillColor).toBe("#2E6BD3");
    expect(equatorStyle.fillColor).toBe("#D6453D");
  });

  it("mirrors gradient colors for southern latitudes", async () => {
    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const style = options?.style;

    const northPoleStyle = style({
      properties: { "ISO3166-1-Alpha-2": "US" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 90],
            [1, 90],
            [1, 90],
            [0, 90],
            [0, 90],
          ],
        ],
      },
    });
    const southPoleStyle = style({
      properties: { "ISO3166-1-Alpha-2": "US" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, -90],
            [1, -90],
            [1, -90],
            [0, -90],
            [0, -90],
          ],
        ],
      },
    });

    expect(southPoleStyle.fillColor).toBe(northPoleStyle.fillColor);
  });

  it("keeps base fill for non-highlighted countries", async () => {
    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const style = options?.style;

    const baseStyle = style({
      properties: { "ISO3166-1-Alpha-2": "CA" },
    });

    expect(baseStyle.fillColor).toBe("#2D2A26");
  });

  it("reapplies styles when highlighted countries change", async () => {
    const { rerender } = render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const layerInstance = geoJsonMock.mock.results[0]?.value;
    rerender(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["DE"]}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(layerInstance?.setStyle).toHaveBeenCalled();
    });
  });

  it("shows a popup with trip titles when trips exist for the country", async () => {
    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          tripsByCountry={{
            US: [
              { id: "trip-1", title: "Pacific Coast" },
              { id: "trip-2", title: "Desert Days" },
            ],
          }}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const mapRegion = screen.getByRole("region", { name: "World map" });
    Object.defineProperty(mapRegion, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const layer = createLayerMock();
    options?.onEachFeature?.(
      { properties: { "ISO3166-1-Alpha-2": "US" } },
      layer,
    );

    layer.handlers.click?.({
      originalEvent: new MouseEvent("mousemove", {
        clientX: 40,
        clientY: 30,
      }),
    });

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Pacific Coast" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Desert Days" }),
      ).toBeInTheDocument();
    });
  });

  it("renders links for popup trips", async () => {
    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          tripsByCountry={{
            US: [{ id: "trip-1", title: "Pacific Coast" }],
          }}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const mapRegion = screen.getByRole("region", { name: "World map" });
    Object.defineProperty(mapRegion, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const layer = createLayerMock();
    options?.onEachFeature?.(
      { properties: { "ISO3166-1-Alpha-2": "US" } },
      layer,
    );

    layer.handlers.click?.({
      originalEvent: new MouseEvent("mousemove", {
        clientX: 40,
        clientY: 30,
      }),
    });

    const link = await screen.findByRole("link", { name: "Pacific Coast" });
    expect(link).toHaveAttribute("href", "/trips/trip-1");
  });

  it("closes the popup when clicking outside the map", async () => {
    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          tripsByCountry={{
            US: [{ id: "trip-1", title: "Pacific Coast" }],
          }}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const mapRegion = screen.getByRole("region", { name: "World map" });
    Object.defineProperty(mapRegion, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const layer = createLayerMock();
    options?.onEachFeature?.(
      { properties: { "ISO3166-1-Alpha-2": "US" } },
      layer,
    );

    layer.handlers.click?.({
      originalEvent: new MouseEvent("mousemove", {
        clientX: 40,
        clientY: 30,
      }),
    });

    expect(
      await screen.findByTestId("world-map-hover-popup"),
    ).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() =>
      expect(
        screen.queryByTestId("world-map-hover-popup"),
      ).not.toBeInTheDocument(),
    );
  });

  it("clicking a trip link targets the trip detail page", async () => {
    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          tripsByCountry={{
            US: [{ id: "trip-42", title: "Pacific Coast" }],
          }}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const mapRegion = screen.getByRole("region", { name: "World map" });
    Object.defineProperty(mapRegion, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const layer = createLayerMock();
    options?.onEachFeature?.(
      { properties: { "ISO3166-1-Alpha-2": "US" } },
      layer,
    );

    layer.handlers.click?.({
      originalEvent: new MouseEvent("mousemove", {
        clientX: 40,
        clientY: 30,
      }),
    });

    const link = await screen.findByRole("link", { name: "Pacific Coast" });
    fireEvent.click(link);
    expect(link).toHaveAttribute("href", "/trips/trip-42");
  });

  it("does not show a popup when the clicked country has no trips", async () => {
    render(
      <LocaleProvider>
        <WorldMap
          ariaLabel="World map"
          highlightedCountries={["US"]}
          tripsByCountry={{
            US: [{ id: "trip-1", title: "Pacific Coast" }],
          }}
          leafletLoader={leafletLoader}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(geoJsonMock).toHaveBeenCalled();
    });

    const mapRegion = screen.getByRole("region", { name: "World map" });
    Object.defineProperty(mapRegion, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const geoJsonArgs = geoJsonMock.mock.calls[0];
    const options = geoJsonArgs?.[1];
    const layer = createLayerMock();
    options?.onEachFeature?.(
      { properties: { "ISO3166-1-Alpha-2": "BR" } },
      layer,
    );

    layer.handlers.click?.({
      originalEvent: new MouseEvent("mousemove", {
        clientX: 20,
        clientY: 20,
      }),
    });

    await waitFor(() => {
      expect(screen.queryByText("Pacific Coast")).not.toBeInTheDocument();
    });
  });
});
