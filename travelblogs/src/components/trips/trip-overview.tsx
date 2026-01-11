"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TripMap from "./trip-map";
import { useTranslation } from "../../utils/use-translation";
import { filterEntriesWithLocation } from "../../utils/entry-location";
import type { EntryLocation } from "../../utils/entry-location";

type TripOverviewTrip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
};

type TripOverviewEntry = {
  id: string;
  tripId: string;
  title: string;
  createdAt: string;
  coverImageUrl: string | null;
  media: { url: string }[];
  location?: EntryLocation | null;
};

type TripOverviewProps = {
  trip: TripOverviewTrip;
  entries: TripOverviewEntry[];
  linkEntries?: boolean;
  entryLinkBase?: string;
  backToTripsHref?: string;
};

const isOptimizedImage = (url: string) => url.startsWith("/");

const getPreviewImage = (entry: TripOverviewEntry) => {
  return (
    entry.coverImageUrl?.trim() ||
    entry.media[0]?.url ||
    "/window.svg"
  );
};

const TripOverview = ({
  trip,
  entries,
  linkEntries = true,
  entryLinkBase,
  backToTripsHref,
}: TripOverviewProps) => {
  const { t, formatDate } = useTranslation();
  const router = useRouter();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);

  const entriesWithLocation = useMemo(
    () => filterEntriesWithLocation(entries),
    [entries],
  );
  const mapLocations = useMemo(
    () =>
      entriesWithLocation.map((entry) => ({
        entryId: entry.id,
        title: entry.title,
        location: entry.location!,
      })),
    [entriesWithLocation],
  );

  const handleOpenEntry = useCallback((entryId: string) => {
    setSelectedEntryId(entryId);
    if (!linkEntries) {
      return;
    }
    const entryHref = entryLinkBase
      ? `${entryLinkBase}/${entryId}`
      : `/entries/${entryId}`;
    router.push(entryHref);
  }, [entryLinkBase, linkEntries, router]);

  // Lazy-load map after initial render to avoid blocking trip view
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMapVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const resolvedSelectedEntryId = useMemo(() => {
    if (!selectedEntryId) {
      return null;
    }
    return entries.some((entry) => entry.id === selectedEntryId)
      ? selectedEntryId
      : null;
  }, [entries, selectedEntryId]);

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        {backToTripsHref ? (
          <Link
            href={backToTripsHref}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← {t('trips.backToTrips')}
          </Link>
        ) : null}
        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
              {t('trips.tripOverview')}
            </p>
            <h1 className="text-3xl font-semibold text-[#2D2A26]">
              {trip.title}
            </h1>
            <p className="text-sm text-[#6B635B]">
              {formatDate(new Date(trip.startDate))} –{" "}
              {formatDate(new Date(trip.endDate))}
            </p>
          </header>

          {trip.coverImageUrl ? (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-[#F2ECE3]">
                <Image
                  src={trip.coverImageUrl}
                  alt={`${t('trips.coverFor')} ${trip.title}`}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                  loading="lazy"
                  unoptimized={!isOptimizedImage(trip.coverImageUrl)}
                />
              </div>
              <div className="space-y-3">
                {isMapVisible ? (
                  <TripMap
                    ariaLabel={t("trips.tripMap")}
                    pinsLabel={t("trips.mapPins")}
                    emptyMessage={t("trips.noLocations")}
                    locations={mapLocations}
                    selectedEntryId={resolvedSelectedEntryId}
                    onSelectEntry={setSelectedEntryId}
                    onOpenEntry={handleOpenEntry}
                  />
                ) : (
                  <div className="h-64 rounded-2xl bg-[#F2ECE3]" />
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {isMapVisible ? (
                <TripMap
                  ariaLabel={t("trips.tripMap")}
                  pinsLabel={t("trips.mapPins")}
                  emptyMessage={t("trips.noLocations")}
                  locations={mapLocations}
                  selectedEntryId={resolvedSelectedEntryId}
                  onSelectEntry={setSelectedEntryId}
                  onOpenEntry={handleOpenEntry}
                />
              ) : (
                <div className="h-64 rounded-2xl bg-[#F2ECE3]" />
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                {t('trips.latestEntries')}
              </p>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B635B]">
              {t('trips.noEntriesYet')}
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {entries.map((entry) => {
                const previewImage = getPreviewImage(entry);
                const isSelected = resolvedSelectedEntryId === entry.id;
                const content = (
                  <>
                    <div
                      className="relative h-[96px] w-[140px] shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]"
                      aria-hidden
                    >
                      <Image
                        src={previewImage}
                        alt={`${t('trips.previewFor')} ${entry.title}`}
                        fill
                        sizes="140px"
                        className="object-cover"
                        loading="lazy"
                        unoptimized={!isOptimizedImage(previewImage)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                        {formatDate(new Date(entry.createdAt))}
                      </p>
                      <p className="mt-1 text-base font-semibold text-[#2D2A26]">
                        {entry.title}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78]">
                      {t('trips.read')}
                    </span>
                  </>
                );
                const cardClassName = isSelected
                  ? "flex flex-wrap items-center gap-4 rounded-2xl border border-[#1F6F78] bg-white p-4 shadow-sm"
                  : "flex flex-wrap items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 transition hover:border-[#1F6F78]/40 hover:shadow-sm";

                if (linkEntries) {
                  const entryHref = entryLinkBase
                    ? `${entryLinkBase}/${entry.id}`
                    : `/entries/${entry.id}`;
                  return (
                    <Link
                      key={entry.id}
                      href={entryHref}
                      aria-current={isSelected ? "true" : undefined}
                      className={cardClassName}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={entry.id}
                    aria-current={isSelected ? "true" : undefined}
                    className={cardClassName}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TripOverview;
