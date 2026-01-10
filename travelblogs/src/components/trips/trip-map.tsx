"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { EntryLocation } from "../../utils/entry-location";

type TripMapLocation = {
  entryId: string;
  title: string;
  location: EntryLocation;
};

type TripMapProps = {
  ariaLabel: string;
  pinsLabel: string;
  emptyMessage?: string;
  locations: TripMapLocation[];
  selectedEntryId?: string | null;
  onSelectEntry?: (entryId: string) => void;
};

/**
 * TripMap component renders an interactive map with entry location markers.
 * Uses Leaflet with OpenStreetMap tiles for map rendering.
 *
 * @param ariaLabel - Accessible label for the map region
 * @param pinsLabel - Accessible label for the pin list
 * @param emptyMessage - Message shown when no locations exist (optional)
 * @param locations - Array of entry locations to display as markers
 * @param selectedEntryId - ID of currently selected entry (optional)
 * @param onSelectEntry - Callback when a marker/pin is selected (optional)
 */
const TripMap = ({
  ariaLabel,
  pinsLabel,
  emptyMessage,
  locations,
  selectedEntryId,
  onSelectEntry,
}: TripMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  const hasLocations = locations.length > 0;

  // Initialize map
  useEffect(() => {
    if (!hasLocations || !mapContainerRef.current || mapRef.current) {
      return;
    }

    // Dynamic import to avoid SSR issues with Leaflet
    import("leaflet").then((L) => {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      // Calculate map bounds from locations
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.location.latitude, loc.location.longitude]),
      );

      // Create map instance
      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
      }).fitBounds(bounds, { padding: [20, 20] });

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current.clear();
        setMapLoaded(false);
      }
    };
  }, [hasLocations, locations]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) {
      return;
    }

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Remove old markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      // Add new markers
      locations.forEach((loc) => {
        const marker = L.marker([loc.location.latitude, loc.location.longitude])
          .addTo(map)
          .bindPopup(loc.title);

        marker.on("click", () => {
          onSelectEntry?.(loc.entryId);
        });

        markersRef.current.set(loc.entryId, marker);
      });
    });
  }, [mapLoaded, locations, onSelectEntry]);

  // Highlight selected marker
  useEffect(() => {
    if (!mapLoaded) {
      return;
    }

    markersRef.current.forEach((marker, entryId) => {
      if (entryId === selectedEntryId) {
        marker.openPopup();
      } else {
        marker.closePopup();
      }
    });
  }, [mapLoaded, selectedEntryId]);

  return (
    <div>
      <div
        ref={mapContainerRef}
        role="region"
        aria-label={ariaLabel}
        className="relative h-64 w-full overflow-hidden rounded-2xl bg-[#F2ECE3]"
      >
        {!hasLocations && emptyMessage ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="text-sm text-[#6B635B]">{emptyMessage}</p>
          </div>
        ) : null}
      </div>
      {hasLocations ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={pinsLabel}>
          {locations.map((location) => (
            <li key={location.entryId}>
              <button
                type="button"
                onClick={() => onSelectEntry?.(location.entryId)}
                aria-pressed={selectedEntryId === location.entryId}
                className={
                  selectedEntryId === location.entryId
                    ? "rounded-full border border-[#1F6F78] bg-[#1F6F78] px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-[#2D2A26] hover:border-[#1F6F78]/40"
                }
              >
                {location.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default TripMap;
