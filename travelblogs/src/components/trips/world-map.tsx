"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

type WorldMapProps = {
  ariaLabel: string;
};

/**
 * WorldMap component renders a static world map view.
 * Uses Leaflet with GeoJSON country shapes for map rendering.
 * Shows all countries in a dark base state with transparent oceans.
 *
 * @param ariaLabel - Accessible label for the map region
 */
const WorldMap = ({ ariaLabel }: WorldMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Final optimized settings for full world visibility
  const zoom = 1.55;
  const latitude = 33;
  const height = 40;

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    // Dynamic import to avoid SSR issues with Leaflet
    import("leaflet").then((L) => {
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
          L.geoJSON(geojson, {
            style: {
              fillColor: "#2D2A26",
              fillOpacity: 0.85,
              color: "#2D2A26",
              weight: 0.5,
              opacity: 0.85,
            },
          }).addTo(map);

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
