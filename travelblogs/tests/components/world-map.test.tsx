// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { LocaleProvider } from "../../src/utils/locale-context";

const mapMock = vi.fn(() => ({
  setView: vi.fn().mockReturnThis(),
  remove: vi.fn(),
}));

const geoJsonMock = vi.fn(() => ({
  addTo: vi.fn().mockReturnThis(),
  setStyle: vi.fn().mockReturnThis(),
}));

const mergeOptionsMock = vi.fn();
const leafletModule = {
  map: mapMock,
  geoJSON: geoJsonMock,
  Icon: {
    Default: {
      mergeOptions: mergeOptionsMock,
    },
  },
};
const leafletLoader = () => Promise.resolve(leafletModule as never);

const originalFetch = globalThis.fetch;
let WorldMap: (props: {
  ariaLabel: string;
  highlightedCountries?: string[];
  leafletLoader?: () => Promise<never>;
}) => JSX.Element;

describe("WorldMap", () => {
  beforeEach(async () => {
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
    const module = await import("../../src/components/trips/world-map");
    WorldMap = module.default;
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as typeof globalThis & { fetch?: unknown }).fetch;
    }
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
});
