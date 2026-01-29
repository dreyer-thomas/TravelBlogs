// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import WorldMap from "../../src/components/trips/world-map";
import { LocaleProvider } from "../../src/utils/locale-context";

const mapMock = vi.fn(() => ({
  setView: vi.fn().mockReturnThis(),
  remove: vi.fn(),
}));

const geoJsonMock = vi.fn(() => ({
  addTo: vi.fn().mockReturnThis(),
}));

const mergeOptionsMock = vi.fn();

const originalFetch = globalThis.fetch;

vi.mock("leaflet", () => ({
  map: mapMock,
  geoJSON: geoJsonMock,
  Icon: {
    Default: {
      mergeOptions: mergeOptionsMock,
    },
  },
}));

describe("WorldMap", () => {
  beforeEach(() => {
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
        <WorldMap ariaLabel="World map" />
      </LocaleProvider>,
    );

    const mapRegion = screen.getByRole("region", { name: "World map" });
    expect(mapRegion).toBeDefined();
  });

  it("has white background for ocean blending", () => {
    const { container } = render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" />
      </LocaleProvider>,
    );

    const mapContainer = container.querySelector('[role="region"]');
    expect(mapContainer).toBeDefined();
    expect(mapContainer?.className).toContain("bg-white");
  });

  it("renders with correct styling", () => {
    const { container } = render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" />
      </LocaleProvider>,
    );

    const mapContainer = container.querySelector('[role="region"]');
    expect(mapContainer?.className).toContain("w-full");
    expect(mapContainer?.className).toContain("relative");
  });

  it("has rounded corners for visual consistency", () => {
    const { container } = render(
      <LocaleProvider>
        <WorldMap ariaLabel="World map" />
      </LocaleProvider>,
    );

    const outerWrapper = container.firstElementChild;
    expect(outerWrapper?.className).toContain("rounded-2xl");
  });
});
