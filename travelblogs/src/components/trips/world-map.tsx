"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSON, Map as LeafletMap } from "leaflet";

type WorldMapProps = {
  ariaLabel: string;
  highlightedCountries?: string[];
  leafletLoader?: () => Promise<typeof import("leaflet")>;
};

type GeoFeature = {
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
};

const BASE_FILL_COLOR = "#2D2A26";
const GRADIENT_STOPS = [
  { latitude: 0, color: "#D6453D" },
  { latitude: 30, color: "#4CBF6B" },
  { latitude: 60, color: "#F6C343" },
  { latitude: 90, color: "#2E6BD3" },
];

const clampLatitude = (latitude: number) =>
  Math.max(0, Math.min(90, Math.abs(latitude)));

const hexToRgb = (hex: string) => {
  const sanitized = hex.replace("#", "");
  const value = parseInt(sanitized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const toHex = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const interpolateColor = (start: string, end: string, ratio: number) => {
  const from = hexToRgb(start);
  const to = hexToRgb(end);
  const clamped = Math.max(0, Math.min(1, ratio));
  return rgbToHex({
    r: from.r + (to.r - from.r) * clamped,
    g: from.g + (to.g - from.g) * clamped,
    b: from.b + (to.b - from.b) * clamped,
  });
};

const resolveGradientColor = (latitude: number | null) => {
  const clampedLatitude = clampLatitude(latitude ?? 0);
  if (clampedLatitude <= GRADIENT_STOPS[0].latitude) {
    return GRADIENT_STOPS[0].color;
  }

  for (let i = 1; i < GRADIENT_STOPS.length; i += 1) {
    const current = GRADIENT_STOPS[i];
    const previous = GRADIENT_STOPS[i - 1];
    if (clampedLatitude <= current.latitude) {
      const ratio =
        (clampedLatitude - previous.latitude) /
        (current.latitude - previous.latitude);
      return interpolateColor(previous.color, current.color, ratio);
    }
  }

  return GRADIENT_STOPS[GRADIENT_STOPS.length - 1].color;
};

const collectLatitudes = (
  coordinates: unknown,
  accumulator: { sum: number; count: number },
) => {
  if (!Array.isArray(coordinates)) {
    return;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    accumulator.sum += coordinates[1];
    accumulator.count += 1;
    return;
  }

  for (const item of coordinates) {
    collectLatitudes(item, accumulator);
  }
};

const getRepresentativeLatitude = (geometry?: GeoFeature["geometry"]) => {
  if (!geometry?.coordinates) {
    return null;
  }

  const accumulator = { sum: 0, count: 0 };
  collectLatitudes(geometry.coordinates, accumulator);

  if (accumulator.count === 0) {
    return null;
  }

  return accumulator.sum / accumulator.count;
};

/**
 * WorldMap component renders a static world map view.
 * Uses Leaflet with GeoJSON country shapes for map rendering.
 * Shows all countries in a dark base state with transparent oceans.
 *
 * @param ariaLabel - Accessible label for the map region
 */
const WorldMap = ({
  ariaLabel,
  highlightedCountries,
  leafletLoader,
}: WorldMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const geoJsonLayerRef = useRef<GeoJSON | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Final optimized settings for full world visibility
  const zoom = 1.55;
  const latitude = 33;
  const height = 40;
  const highlightSet = useMemo(
    () =>
      new Set(
        (highlightedCountries ?? []).map((country) =>
          country.trim().toUpperCase(),
        ),
      ),
    [highlightedCountries],
  );

  const getFeatureStyle = (feature?: GeoFeature) => {
    const code = feature?.properties?.["ISO3166-1-Alpha-2"];
    const normalized =
      typeof code === "string" ? code.trim().toUpperCase() : null;
    const isHighlighted = normalized ? highlightSet.has(normalized) : false;
    const latitude = isHighlighted
      ? getRepresentativeLatitude(feature?.geometry)
      : null;

    return {
      fillColor: isHighlighted ? resolveGradientColor(latitude) : BASE_FILL_COLOR,
      fillOpacity: 0.85,
      color: BASE_FILL_COLOR,
      weight: 0.5,
      opacity: 0.85,
    };
  };

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    // Dynamic import to avoid SSR issues with Leaflet
    const loadLeaflet = leafletLoader ?? (() => import("leaflet"));
    loadLeaflet().then((L) => {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL(
          "leaflet/dist/images/marker-icon-2x.png",
          import.meta.url,
        ).toString(),
        iconUrl: new URL(
          "leaflet/dist/images/marker-icon.png",
          import.meta.url,
        ).toString(),
        shadowUrl: new URL(
          "leaflet/dist/images/marker-shadow.png",
          import.meta.url,
        ).toString(),
      });

      // Create map instance centered on world view with fixed zoom
      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        dragging: false,
        zoomControl: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        attributionControl: false,
        zoomSnap: 0.1, // Allow fractional zoom levels
        zoomDelta: 0.1,
      }).setView([latitude, 0], zoom);

      if (typeof fetch !== "function") {
        setMapLoaded(true);
        return;
      }

      // Fetch and add world countries GeoJSON
      fetch("/world-countries.geojson")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to load world map data.");
          }
          return response.json();
        })
        .then((geojson) => {
          const layer = L.geoJSON(geojson, {
            style: getFeatureStyle,
          });
          layer.addTo(map);
          geoJsonLayerRef.current = layer;

          setMapLoaded(true);
        })
        .catch((error) => {
          console.error("Failed to load world map data:", error);
          setMapLoaded(true);
        });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapLoaded(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!geoJsonLayerRef.current) {
      return;
    }

    geoJsonLayerRef.current.setStyle(getFeatureStyle);
  }, [highlightSet]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-8">
      <div
        ref={mapContainerRef}
        role="region"
        aria-label={ariaLabel}
        className="relative w-full overflow-hidden rounded-xl bg-white [&_.leaflet-container]:bg-white [&_.leaflet-tile-pane]:opacity-80"
        style={{ height: `${height}rem` }}
      >
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[#1F6F78]/20" />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMap;
