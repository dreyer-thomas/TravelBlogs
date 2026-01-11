"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { EntryLocation } from "../../utils/entry-location";

type EntryHeroMapProps = {
  location: EntryLocation;
  boundsLocations?: EntryLocation[];
  ariaLabel: string;
};

const EntryHeroMap = ({
  location,
  boundsLocations,
  ariaLabel,
}: EntryHeroMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const clearMap = () => {
      markerRef.current?.remove();
      markerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };

    clearMap();

    let isActive = true;

    import("leaflet").then((L) => {
      if (!mapContainerRef.current || !isActive) {
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

      const map = L.map(mapContainerRef.current, {
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
        attributionControl: false,
        touchZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const locationsToFit =
        boundsLocations && boundsLocations.length > 0
          ? boundsLocations
          : [location];
      if (locationsToFit.length > 1) {
        const bounds = L.latLngBounds(
          locationsToFit.map((loc) => [loc.latitude, loc.longitude]),
        );
        map.fitBounds(bounds, { padding: [12, 12] });
      } else {
        map.setView([location.latitude, location.longitude], 9);
      }

      markerRef.current = L.marker(
        [location.latitude, location.longitude],
        { interactive: false },
      ).addTo(map);

      mapRef.current = map;
    });

    return () => {
      isActive = false;
      clearMap();
    };
  }, [boundsLocations, location.latitude, location.longitude]);

  return (
    <div
      ref={mapContainerRef}
      role="region"
      aria-label={ariaLabel}
      className="h-36 w-48 overflow-hidden rounded-2xl border border-white/40 bg-[#F2ECE3] shadow-lg sm:h-40 sm:w-60"
    />
  );
};

export default EntryHeroMap;
