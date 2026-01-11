"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

import type { EntryLocation } from "../../utils/entry-location";

type FullscreenTripMapEntry = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  media: { url: string }[];
  location?: EntryLocation | null;
};

type FullscreenTripMapProps = {
  tripTitle: string;
  entries: FullscreenTripMapEntry[];
  entryLinkBase: string;
  mapLabel: string;
  pinsLabel: string;
  emptyMessage: string;
  backHref?: string;
  backLabel?: string;
};

type TripMapLocation = {
  entryId: string;
  title: string;
  location: EntryLocation;
  heroImageUrl: string;
  entryHref: string;
};

const isSafeUrl = (value: string) =>
  value.startsWith("/") ||
  value.startsWith("http://") ||
  value.startsWith("https://");

const isValidEntryUrl = (value: string) =>
  value.startsWith("/trips/") || value.startsWith("/entries/");

const sanitizeUrl = (value: string, fallback: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return isSafeUrl(trimmed) ? trimmed : fallback;
};

const sanitizeEntryUrl = (value: string, fallback: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  // Validate both that it's a safe URL and starts with expected paths
  return isSafeUrl(trimmed) && isValidEntryUrl(trimmed) ? trimmed : fallback;
};

const getPreviewImage = (entry: FullscreenTripMapEntry) => {
  return entry.coverImageUrl?.trim() || entry.media[0]?.url || "/window.svg";
};

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

const FullscreenTripMap = ({
  tripTitle,
  entries,
  entryLinkBase,
  mapLabel,
  pinsLabel,
  emptyMessage,
  backHref,
  backLabel,
}: FullscreenTripMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapLocations = useMemo<TripMapLocation[]>(() => {
    const base = entryLinkBase.endsWith("/")
      ? entryLinkBase.slice(0, -1)
      : entryLinkBase;

    return entries
      .filter((entry) => {
        const location = entry.location;
        return (
          location &&
          Number.isFinite(location.latitude) &&
          Number.isFinite(location.longitude)
        );
      })
      .map((entry) => {
        const heroImageUrl = sanitizeUrl(getPreviewImage(entry), "/window.svg");
        const entryHref = sanitizeEntryUrl(`${base}/${entry.id}`, "#");

        return {
          entryId: entry.id,
          title: entry.title,
          location: entry.location!,
          heroImageUrl,
          entryHref,
        };
      });
  }, [entries, entryLinkBase]);

  const hasLocations = mapLocations.length > 0;
  const boundsSource = mapLocations;

  useEffect(() => {
    if (!hasLocations || !mapContainerRef.current || mapRef.current) {
      return;
    }

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

      const bounds = L.latLngBounds(
        boundsSource.map((loc) => [
          loc.location.latitude,
          loc.location.longitude,
        ]),
      );

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        closePopupOnClick: true,
      }).fitBounds(bounds, { padding: [20, 20] });

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
  }, [boundsSource, hasLocations]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) {
      return;
    }

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      mapLocations.forEach((loc) => {
        const popupLabel = `${pinsLabel}: ${loc.title}`;
        const popupContent = `
          <div class="trip-map-popup-card">
            <div class="trip-map-popup-image">
              <img
                src="${escapeHtml(loc.heroImageUrl)}"
                alt="${escapeHtml(loc.title)}"
                loading="lazy"
              />
            </div>
            <a
              class="trip-map-popup-link"
              href="${escapeHtml(loc.entryHref)}"
              aria-label="${escapeHtml(popupLabel)}"
            >
              ${escapeHtml(loc.title)}
            </a>
          </div>
        `;

        const marker = L.marker([
          loc.location.latitude,
          loc.location.longitude,
        ], {
          title: loc.title,
          alt: loc.title,
        })
          .addTo(map)
          .bindPopup(popupContent, {
            closeButton: false,
            className: "trip-map-popup trip-map-popup-rich",
          });

        marker.on("click", (event: L.LeafletMouseEvent) => {
          event.originalEvent?.stopPropagation();
          marker.openPopup();
        });

        markersRef.current.set(loc.entryId, marker);
      });
    });
  }, [mapLoaded, mapLocations, pinsLabel]);

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        {backHref && backLabel ? (
          <a
            href={backHref}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← {backLabel}
          </a>
        ) : null}
        <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
          {tripTitle}
        </p>
        <h1 className="text-2xl font-semibold text-[#2D2A26]">{mapLabel}</h1>
      </header>
      <div
        ref={mapContainerRef}
        role="region"
        aria-label={mapLabel}
        className="relative h-[70vh] w-full overflow-hidden rounded-3xl bg-[#F2ECE3]"
      >
        {!hasLocations ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="text-sm text-[#6B635B]">{emptyMessage}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default FullscreenTripMap;
