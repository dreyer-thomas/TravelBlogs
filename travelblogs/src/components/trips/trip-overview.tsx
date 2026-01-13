"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TripMap from "./trip-map";
import { useTranslation } from "../../utils/use-translation";
import { filterEntriesWithLocation } from "../../utils/entry-location";
import { getDistinctTagList, normalizeTagName } from "../../utils/entry-tags";
import type { TripOverviewEntry, TripOverviewTrip } from "../../types/trip-overview";

type TripOverviewProps = {
  trip: TripOverviewTrip;
  entries: TripOverviewEntry[];
  linkEntries?: boolean;
  entryLinkBase?: string;
  backToTripsHref?: string;
  mapHref?: string;
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
  mapHref,
}: TripOverviewProps) => {
  const { t, formatDate } = useTranslation();
  const router = useRouter();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);

  const distinctTags = useMemo(() => getDistinctTagList(entries), [entries]);
  const shouldUseChips = distinctTags.length > 0 && distinctTags.length <= 8;
  const shouldUseSelect = distinctTags.length > 8;

  const normalizedSelectedTags = useMemo(
    () => new Set(selectedTags.map((tag) => normalizeTagName(tag))),
    [selectedTags],
  );

  // Pre-compute normalized tags for each entry to avoid re-normalizing on every filter
  const entriesWithNormalizedTags = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        normalizedTags: entry.tags.map((tag) => normalizeTagName(tag)),
      })),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    if (selectedTags.length === 0) {
      return entries;
    }
    return entriesWithNormalizedTags
      .filter((entry) =>
        entry.normalizedTags.some((normalizedTag) =>
          normalizedSelectedTags.has(normalizedTag),
        ),
      )
      .map(({ normalizedTags, ...entry }) => entry);
  }, [entries, entriesWithNormalizedTags, normalizedSelectedTags, selectedTags.length]);

  const entriesWithLocation = useMemo(
    () => filterEntriesWithLocation(filteredEntries),
    [filteredEntries],
  );
  const mapLocations = useMemo(
    () =>
      entriesWithLocation.map((entry) => ({
        entryId: entry.id,
        title: entry.title,
        location: entry.location!,
        createdAt: entry.createdAt,
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
    return filteredEntries.some((entry) => entry.id === selectedEntryId)
      ? selectedEntryId
      : null;
  }, [filteredEntries, selectedEntryId]);
  const mapActionLabel = t("trips.viewFullMap");
  const hasSelectedTags = selectedTags.length > 0;

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag],
    );
  }, []);

  const clearTagSelection = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const values = Array.from(event.target.selectedOptions).map(
        (option) => option.value,
      );
      setSelectedTags(values);
    },
    [],
  );

  const mapContent = isMapVisible ? (
    <div className="relative isolate">
      <TripMap
        ariaLabel={t("trips.tripMap")}
        pinsLabel={t("trips.mapPins")}
        emptyMessage={t("trips.noLocations")}
        locations={mapLocations}
        selectedEntryId={resolvedSelectedEntryId}
        onSelectEntry={setSelectedEntryId}
        onOpenEntry={handleOpenEntry}
      />
      {mapHref ? (
        <Link
          href={mapHref}
          aria-label={mapActionLabel}
          className="absolute right-4 top-4 z-[1000] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-[#1F6F78] text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26] pointer-events-auto"
        >
          <span className="sr-only">{mapActionLabel}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z" />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
        </Link>
      ) : null}
    </div>
  ) : (
    <div className="h-64 rounded-2xl bg-[#F2ECE3]" />
  );

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
                {mapContent}
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {mapContent}
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
              {distinctTags.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                      {t("trips.filterTags")}
                    </p>
                    {hasSelectedTags ? (
                      <button
                        type="button"
                        onClick={clearTagSelection}
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78] transition hover:text-[#195C63]"
                      >
                        {t("trips.clearTagFilters")}
                      </button>
                    ) : null}
                  </div>
                  {shouldUseChips ? (
                    <div className="flex flex-wrap gap-2">
                      {distinctTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            aria-pressed={isSelected}
                            className={
                              isSelected
                                ? "rounded-full border border-[#1F6F78] bg-[#1F6F78]/10 px-3 py-1 text-xs font-semibold text-[#1F6F78]"
                                : "rounded-full border border-black/10 bg-[#F2ECE3] px-3 py-1 text-xs font-semibold text-[#2D2A26]"
                            }
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  ) : shouldUseSelect ? (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setIsTagFilterOpen((prev) => !prev)}
                        aria-expanded={isTagFilterOpen}
                        aria-controls="trip-tag-filter"
                        className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#2D2A26] transition hover:border-[#1F6F78]/40"
                      >
                        {t("trips.filterTags")}
                      </button>
                      {isTagFilterOpen ? (
                        <div>
                          <label
                            htmlFor="trip-tag-filter"
                            className="text-xs uppercase tracking-[0.2em] text-[#6B635B]"
                          >
                            {t("trips.filterTags")}
                          </label>
                          <select
                            id="trip-tag-filter"
                            multiple
                            value={selectedTags}
                            onChange={handleSelectChange}
                            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#2D2A26]"
                          >
                            {distinctTags.map((tag) => (
                              <option key={tag} value={tag}>
                                {tag}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {filteredEntries.map((entry) => {
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
                      {entry.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              title={tag}
                              className="inline-flex max-w-[12rem] items-center rounded-full bg-[#F2ECE3] px-3 py-1 text-xs font-semibold text-[#2D2A26] sm:max-w-[16rem]"
                            >
                              <span className="truncate" dir="auto">{tag}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
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
