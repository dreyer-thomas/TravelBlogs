"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, PopupEvent } from "leaflet";
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
  onOpenEntry?: (entryId: string) => void;
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
  onOpenEntry,
}: TripMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  const hasLocations = locations.length > 0;
  const handleOpenEntry = onOpenEntry ?? onSelectEntry;

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return char;
      }
    });

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

      // Calculate map bounds from locations
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.location.latitude, loc.location.longitude]),
      );

      // Create map instance
      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        closePopupOnClick: false,
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
        const popupLabel = `${pinsLabel}: ${loc.title}`;
        const popupContent = `
          <button
            type="button"
            class="trip-map-popup-button"
            data-entry-id="${escapeHtml(loc.entryId)}"
            aria-label="${escapeHtml(popupLabel)}"
          >
            ${escapeHtml(loc.title)}
          </button>
        `;

        const marker = L.marker([loc.location.latitude, loc.location.longitude], {
          title: loc.title,
          alt: loc.title,
        })
          .addTo(map)
          .bindPopup(popupContent, {
            closeButton: false,
            className: "trip-map-popup",
            autoClose: false,
            closeOnClick: false,
          });

        const attachPopupButtonHandler = (popupEl?: HTMLElement | null) => {
          if (!popupEl || !handleOpenEntry) {
            return;
          }
          const button = popupEl.querySelector<HTMLButtonElement>(
            'button[data-entry-id]',
          );
          if (!button || button.dataset.bound === "true") {
            return;
          }
          const handleClick = (event: MouseEvent) => {
            event.preventDefault();
            handleOpenEntry(loc.entryId);
          };
          button.dataset.bound = "true";
          button.addEventListener("click", handleClick);
          marker.once("popupclose", () => {
            button.removeEventListener("click", handleClick);
            button.dataset.bound = "false";
          });
        };

        marker.on("click", (event: L.LeafletMouseEvent) => {
          event.originalEvent?.stopPropagation();
          marker.openPopup();
          onSelectEntry?.(loc.entryId);
          setTimeout(() => {
            const popupEl = marker.getPopup()?.getElement();
            attachPopupButtonHandler(popupEl ?? null);
          }, 0);
        });

        marker.on("popupopen", (event: PopupEvent) => {
          attachPopupButtonHandler(event.popup.getElement());
        });

        markersRef.current.set(loc.entryId, marker);
      });
    });
  }, [mapLoaded, locations, onSelectEntry, handleOpenEntry, pinsLabel]);

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
    </div>
  );
};

export default TripMap;
