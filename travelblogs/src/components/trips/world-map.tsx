"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSON, Map as LeafletMap, PathOptions } from "leaflet";

type WorldMapProps = {
  ariaLabel: string;
  highlightedCountries?: string[];
  tripsByCountry?: Record<string, { id: string; title: string }[]>;
  leafletLoader?: () => Promise<typeof import("leaflet")>;
};

type TripSummary = { id: string; title: string };

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

const getBaseStyle = (): PathOptions => ({
  fillColor: BASE_FILL_COLOR,
  fillOpacity: 0.85,
  color: BASE_FILL_COLOR,
  weight: 0.5,
  opacity: 0.85,
});

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
 * WorldMap component renders an interactive world map view with zoom and pan.
 * Uses Leaflet with GeoJSON country shapes for map rendering.
 * Shows all countries in a dark base state with transparent oceans.
 *
 * @param ariaLabel - Accessible label for the map region
 */
const WorldMap = (props: WorldMapProps) => {
  const { ariaLabel, highlightedCountries, leafletLoader } = props;
  const tripsByCountry = props.tripsByCountry;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const geoJsonLayerRef = useRef<GeoJSON | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredTrips, setHoveredTrips] = useState<TripSummary[] | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const hoveredCountryRef = useRef<string | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Final optimized settings for full world visibility
  const zoom = 1.55;
  const latitude = 33;
  const highlightSet = useMemo(
    () =>
      new Set(
        (highlightedCountries ?? []).map((country) =>
          country.trim().toUpperCase(),
        ),
      ),
    [highlightedCountries],
  );
  const tripsByCountryMap = useMemo(() => {
    if (!tripsByCountry) {
      return null;
    }

    const normalized: Record<string, TripSummary[]> = {};
    for (const [code, trips] of Object.entries(tripsByCountry)) {
      if (!code) {
        continue;
      }
      normalized[code.trim().toUpperCase()] = trips;
    }
    return normalized;
  }, [tripsByCountry]);
  const tripsByCountryRef = useRef<Record<string, TripSummary[]> | null>(null);
  const featureStyleRef = useRef<(feature?: GeoFeature) => PathOptions>(() =>
    getBaseStyle(),
  );
  const getFeatureStyle = useCallback(
    (feature?: GeoFeature): PathOptions => {
      const code = feature?.properties?.["ISO3166-1-Alpha-2"];
      const normalized =
        typeof code === "string" ? code.trim().toUpperCase() : null;
      const isHighlighted = normalized ? highlightSet.has(normalized) : false;
      const latitude = isHighlighted
        ? getRepresentativeLatitude(feature?.geometry)
        : null;

      return {
        ...getBaseStyle(),
        fillColor: isHighlighted
          ? resolveGradientColor(latitude)
          : BASE_FILL_COLOR,
      };
    },
    [highlightSet],
  );
  useEffect(() => {
    featureStyleRef.current = getFeatureStyle;
  }, [getFeatureStyle]);

  const getHoverPosition = (event?: {
    originalEvent?: MouseEvent;
    latlng?: { lat: number; lng: number };
  }) => {
    if (!mapContainerRef.current) {
      return null;
    }

    if (event?.originalEvent) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      return {
        x: event.originalEvent.clientX - rect.left,
        y: event.originalEvent.clientY - rect.top,
      };
    }

    if (mapRef.current && event?.latlng) {
      const point = mapRef.current.latLngToContainerPoint(event.latlng);
      return { x: point.x, y: point.y };
    }

    return null;
  };

  const clearHoverState = () => {
    hoveredCountryRef.current = null;
    setHoveredCountry(null);
    setHoveredTrips(null);
    setHoverPosition(null);
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
        dragging: true,
        zoomControl: true,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: true,
        attributionControl: false,
        zoomSnap: 0.1, // Allow fractional zoom levels
        zoomDelta: 1,
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
            style: (feature) => featureStyleRef.current(feature),
            onEachFeature: (feature, layerInstance) => {
              const handleClick = (event?: {
                target?: unknown;
                originalEvent?: MouseEvent;
                latlng?: { lat: number; lng: number };
              }) => {
                if (event) {
                  L.DomEvent.stopPropagation(event as unknown as Event);
                }
                const code = feature?.properties?.["ISO3166-1-Alpha-2"];
                const normalized =
                  typeof code === "string" ? code.trim().toUpperCase() : null;
                if (!normalized) {
                  clearHoverState();
                  return;
                }

                const availableTrips =
                  tripsByCountryRef.current?.[normalized] ?? null;
                if (!availableTrips || availableTrips.length === 0) {
                  clearHoverState();
                  return;
                }

                hoveredCountryRef.current = normalized;
                setHoveredCountry(normalized);
                setHoveredTrips(availableTrips);
                const nextPosition = getHoverPosition(event);
                if (nextPosition) {
                  setHoverPosition(nextPosition);
                }
              };

              layerInstance.on({
                click: handleClick,
              });
            },
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
        clearHoverState();
      }
    };
  }, [leafletLoader]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) {
      return;
    }
    const map = mapRef.current;
    const handleMapClick = () => {
      clearHoverState();
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [mapLoaded]);

  useEffect(() => {
    if (!hoveredTrips) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (popupRef.current?.contains(target)) {
        return;
      }
      if (mapContainerRef.current?.contains(target)) {
        return;
      }
      clearHoverState();
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [hoveredTrips]);

  useEffect(() => {
    tripsByCountryRef.current = tripsByCountryMap;
    const currentCountry = hoveredCountryRef.current;
    if (!tripsByCountryMap) {
      clearHoverState();
      return;
    }
    if (!currentCountry) {
      return;
    }
    const nextTrips = tripsByCountryMap[currentCountry] ?? null;
    if (!nextTrips || nextTrips.length === 0) {
      clearHoverState();
      return;
    }
    setHoveredTrips(nextTrips);
  }, [tripsByCountryMap]);

  useEffect(() => {
    if (!geoJsonLayerRef.current) {
      return;
    }

    geoJsonLayerRef.current.setStyle(getFeatureStyle);
  }, [getFeatureStyle, highlightSet]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-8">
      <div
        ref={mapContainerRef}
        role="region"
        aria-label={ariaLabel}
        className="relative w-full aspect-[2/1] overflow-hidden rounded-xl bg-white [&_.leaflet-container]:z-0 [&_.leaflet-container]:bg-white [&_.leaflet-pane]:z-0 [&_.leaflet-top]:z-0 [&_.leaflet-bottom]:z-0 [&_.leaflet-tile-pane]:opacity-80"
      >
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[#1F6F78]/20" />
          </div>
        )}
        {hoveredTrips && hoverPosition && (
          <div
            data-testid="world-map-hover-popup"
            data-country={hoveredCountry ?? undefined}
            className="pointer-events-auto absolute z-[1000] rounded-xl border border-black/10 bg-white/95 px-4 py-3 text-xs text-[#2D2A26] shadow-lg"
            style={{
              left: hoverPosition.x + 12,
              top: hoverPosition.y + 12,
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            ref={popupRef}
          >
            <ul className="space-y-1">
              {hoveredTrips.map((trip) => (
                <li key={trip.id} className="font-medium">
                  <Link href={`/trips/${trip.id}`} className="hover:underline">
                    {trip.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMap;
