"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import MediaGallery from "../media/media-gallery";
import { DEFAULT_INLINE_ALT } from "../../utils/entry-content";
import { detectEntryFormat, plainTextToTiptapJson } from "../../utils/entry-format";
import { extractEntryImageNodesFromJson } from "../../utils/tiptap-image-helpers";
import type { EntryReaderData } from "../../utils/entry-reader";
import type { EntryLocation } from "../../utils/entry-location";
import { formatEntryLocationDisplay } from "../../utils/entry-location";
import { getMediaTypeFromUrl } from "../../utils/media";
import { generateVideoThumbnail } from "../../utils/video-thumbnail";
import FullScreenPhotoViewer from "./full-screen-photo-viewer";
import { useTranslation } from "../../utils/use-translation";
import EntryHeroMap from "./entry-hero-map";
import TripMap from "../trips/trip-map";
import EntryReaderRichText from "./entry-reader-rich-text";
import { countryCodeToFlag, countryCodeToName } from "../../utils/country-flag";
import { formatWeatherDisplay } from "../../utils/weather-display";
import { detectBrowserLocale } from "../../utils/i18n";

type EntryReaderProps = {
  entry: EntryReaderData;
  entryLinkBase?: string;
  backToTripHref?: string;
  mapHref?: string;
  isSharedView?: boolean;
  heroMapLocations?: EntryLocation[];
};

const isOptimizedImage = (url: string) => url.startsWith("/");

const EntryReader = ({
  entry,
  entryLinkBase,
  backToTripHref,
  mapHref,
  isSharedView = false,
  heroMapLocations,
}: EntryReaderProps) => {
  const { t, formatDate, locale } = useTranslation();
  const [heroVideoPoster, setHeroVideoPoster] = useState<string | null>(null);

  const resolveAltText = useCallback((alt?: string | null) => {
    if (!alt) {
      return null;
    }
    if (alt === DEFAULT_INLINE_ALT) {
      return t("entries.entryPhoto");
    }
    return alt;
  }, [t]);

  const getNavLabel = (title?: string | null, date?: string | null) => {
    if (title && title.trim()) {
      return title;
    }
    if (date) {
      return formatDate(new Date(date));
    }
    return t('entries.dailyEntry');
  };
  const heroMedia = entry.media[0];
  const heroMediaType = heroMedia
    ? getMediaTypeFromUrl(heroMedia.url)
    : "image";
  const heroIsVideo = heroMediaType === "video";
  const heroAlt = heroMedia?.alt ?? t("entries.entryHeroMedia");

  // Generate thumbnail for hero video
  useEffect(() => {
    if (heroIsVideo && heroMedia) {
      let mounted = true;

      generateVideoThumbnail(heroMedia.url, 0.5)
        .then((thumbnailUrl) => {
          if (mounted) {
            setHeroVideoPoster(thumbnailUrl);
          }
        })
        .catch((error) => {
          console.error("Failed to generate hero video thumbnail for", heroMedia.url, ":", error);
        });

      return () => {
        mounted = false;
      };
    }
  }, [heroIsVideo, heroMedia]);
  const galleryItems = entry.media;
  const entryTitle = entry.title || t("entries.dailyEntry");
  const entryDate = formatDate(new Date(entry.createdAt));
  const countryFlag = useMemo(
    () => countryCodeToFlag(entry.location?.countryCode ?? ""),
    [entry.location?.countryCode],
  );
  const countryName = useMemo(
    () =>
      entry.location?.countryCode
        ? countryCodeToName(entry.location.countryCode, locale)
        : null,
    [entry.location?.countryCode, locale],
  );
  const weatherLocale = useMemo(
    () => (isSharedView ? detectBrowserLocale() : locale),
    [isSharedView, locale],
  );
  const weatherDisplay = useMemo(
    () =>
      formatWeatherDisplay(
        entry.weatherCondition ?? null,
        entry.weatherTemperature ?? null,
        entry.weatherIconCode ?? null,
        weatherLocale,
      ),
    [
      entry.weatherCondition,
      entry.weatherTemperature,
      entry.weatherIconCode,
      weatherLocale,
    ],
  );
  const showLocationMeta = Boolean(countryFlag || countryName || weatherDisplay);
  const showSharedHeroOverlay = isSharedView;
  const hasTags = entry.tags.length > 0;
  const entryBody = entry.body ?? "";
  const entryMediaIdByUrl = useMemo(
    () => new Map(entry.media.map((media) => [media.url, media.id])),
    [entry.media],
  );
  const entryFormat = useMemo(
    () => detectEntryFormat(entryBody),
    [entryBody],
  );
  const tiptapContent = useMemo(() => {
    if (entryFormat === "tiptap") {
      return entryBody;
    }
    return plainTextToTiptapJson(entryBody, entryMediaIdByUrl);
  }, [entryBody, entryFormat, entryMediaIdByUrl]);
  const inlineImages = useMemo(
    () => extractEntryImageNodesFromJson(tiptapContent),
    [tiptapContent],
  );
  const viewerImages = useMemo(() => {
    const images = new Map<
      string,
      { url: string; alt: string; mediaType?: "image" | "video" }
    >();

    entry.media.forEach((media) => {
      const resolvedAlt = resolveAltText(media.alt?.trim());
      images.set(media.url, {
        url: media.url,
        alt: resolvedAlt || entry.title || t("entries.tripPhoto"),
        mediaType: getMediaTypeFromUrl(media.url),
      });
    });

    inlineImages.forEach((node) => {
      const mediaItem = node.entryMediaId
        ? entry.media.find((item) => item.id === node.entryMediaId)
        : undefined;
      const url = mediaItem?.url ?? node.src;
      if (!url || images.has(url)) {
        return;
      }

      images.set(url, {
        url,
        alt:
          resolveAltText(node.alt?.trim()) ||
          resolveAltText(mediaItem?.alt?.trim()) ||
          entry.title ||
          t("entries.tripPhoto"),
        mediaType: "image",
      });
    });

    return Array.from(images.values());
  }, [entry.media, entry.title, inlineImages, resolveAltText, t]);
  const hasBodyContent = useMemo(() => {
    try {
      const parsed = JSON.parse(tiptapContent);
      const nodes = Array.isArray(parsed?.content) ? parsed.content : [];
      type TiptapNode = {
        type?: string;
        text?: string;
        content?: TiptapNode[];
      };
      const hasContent = (node: TiptapNode | undefined): boolean => {
        if (!node) {
          return false;
        }
        if (node.type === "entryImage") {
          return true;
        }
        if (node.type === "text" && typeof node.text === "string") {
          return node.text.trim().length > 0;
        }
        if (Array.isArray(node.content)) {
          return node.content.some(hasContent);
        }
        return false;
      };
      return nodes.some(hasContent);
    } catch {
      return false;
    }
  }, [tiptapContent]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<"viewer" | "slideshow">(
    "viewer",
  );

  const navigation = entry.navigation ?? {
    previousEntryId: null,
    nextEntryId: null,
    previousEntryTitle: null,
    nextEntryTitle: null,
    previousEntryDate: null,
    nextEntryDate: null,
  };

  const previousLabel = getNavLabel(
    navigation.previousEntryTitle,
    navigation.previousEntryDate,
  );
  const nextLabel = getNavLabel(
    navigation.nextEntryTitle,
    navigation.nextEntryDate,
  );
  const mapActionLabel = t("trips.viewFullMap");

  const openViewerAtUrl = useCallback(
    (url: string) => {
      if (viewerImages.length === 0) {
        return;
      }
      const index = viewerImages.findIndex((image) => image.url === url);
      setViewerIndex(index >= 0 ? index : 0);
      setViewerMode("viewer");
      setIsViewerOpen(true);
    },
    [viewerImages],
  );

  const startSlideshow = useCallback(() => {
    if (viewerImages.length === 0) {
      return;
    }
    setViewerIndex(0);
    setViewerMode("slideshow");
    setIsViewerOpen(true);
  }, [viewerImages.length]);

  const closeViewer = useCallback(() => {
    setIsViewerOpen(false);
  }, []);


  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
        {backToTripHref ? (
          <Link
            href={backToTripHref}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← {t('entries.backToTrip')}
          </Link>
        ) : null}
        {!isSharedView ? (
          <header className="flex flex-col">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
              {entryDate}
            </p>
            {showLocationMeta ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-lg text-[#2D2A26]">
                {countryFlag ? (
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {countryFlag}
                  </span>
                ) : null}
                {countryName ? <span>{countryName}</span> : null}
                {weatherDisplay ? (
                  <span className="flex items-center gap-1">
                    <span aria-hidden="true">{weatherDisplay.icon}</span>
                    <span>{weatherDisplay.temperature}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
            <h1 className="mt-2 text-4xl font-semibold text-[#2D2A26] sm:text-5xl">
              {entryTitle}
            </h1>
            {hasTags ? (
              <div
                role="list"
                aria-label={t("entries.tags")}
                className="mt-3 flex flex-wrap gap-2 sm:gap-3"
              >
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    role="listitem"
                    title={tag}
                    className="inline-flex max-w-[12rem] items-center rounded-full bg-[#F2ECE3] px-3 py-1 text-xs font-semibold text-[#2D2A26] sm:max-w-[16rem]"
                  >
                    <span className="truncate" dir="auto">{tag}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </header>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="relative isolate">
            {heroMedia ? (
              heroIsVideo ? (
                <div className="relative z-0">
                  <video
                    src={heroMedia.url}
                    poster={heroVideoPoster ?? undefined}
                    controls
                    preload="metadata"
                    playsInline
                    autoPlay={isSharedView}
                    muted={isSharedView}
                    className="h-auto w-full object-cover"
                    aria-label={heroAlt}
                    onLoadedMetadata={(event) => {
                      if (!isSharedView) {
                        return;
                      }
                      const video = event.currentTarget;
                      video.play().catch(() => undefined);
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openViewerAtUrl(heroMedia.url)}
                  className="relative z-0 block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
                  aria-label={t("entries.openHeroPhoto")}
                >
                  <Image
                    src={heroMedia.url}
                    alt={heroAlt}
                    width={heroMedia.width ?? 1600}
                    height={heroMedia.height ?? 1000}
                    sizes="(min-width: 1024px) 960px, 100vw"
                    className="h-auto w-full object-cover"
                    loading="lazy"
                    unoptimized={!isOptimizedImage(heroMedia.url)}
                  />
                </button>
              )
            ) : (
              <div className="flex min-h-[320px] items-center justify-center bg-[#F2ECE3] text-sm text-[#6B635B]">
                {t("entries.noMediaAvailable")}
              </div>
            )}
            {showSharedHeroOverlay ? (
              <>
                <div
                  role="group"
                  aria-label={t("entries.entryHeroOverlay")}
                  className="pointer-events-none absolute left-0 top-0 z-30 px-6 pt-6 sm:px-8 sm:pt-8"
                >
                  <div className="pointer-events-auto flex max-h-[50vh] max-w-[32rem] flex-col overflow-y-auto rounded-2xl bg-black/45 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur-sm sm:px-5 sm:py-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white drop-shadow-sm">
                      {entryDate}
                    </p>
                    {showLocationMeta ? (
                      <div className="mt-2 flex w-full flex-wrap items-center gap-2 text-lg text-white">
                        <div className="flex flex-wrap items-center gap-2">
                          {countryFlag ? (
                            <span className="text-2xl leading-none" aria-hidden="true">
                              {countryFlag}
                            </span>
                          ) : null}
                          {countryName ? <span>{countryName}</span> : null}
                        </div>
                        {weatherDisplay ? (
                          <span className="ml-auto flex items-center gap-1">
                            <span aria-hidden="true">{weatherDisplay.icon}</span>
                            <span>{weatherDisplay.temperature}</span>
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <h1 className="mt-1 text-3xl font-semibold text-white drop-shadow-sm sm:text-4xl">
                      {entryTitle}
                    </h1>
                    {hasTags ? (
                      <div
                        role="list"
                        aria-label={t("entries.tags")}
                        className="mt-3 flex flex-wrap gap-2 sm:gap-3"
                      >
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            role="listitem"
                            title={tag}
                            className="inline-flex max-w-[12rem] items-center rounded-full bg-[#F2ECE3] px-3 py-1 text-xs font-semibold text-[#2D2A26] sm:max-w-[16rem]"
                          >
                            <span className="truncate" dir="auto">{tag}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                {entry.location ? (
                  <div className="absolute bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
                    <EntryHeroMap
                      location={entry.location}
                      boundsLocations={heroMapLocations}
                      ariaLabel={t("entries.entryLocationMap")}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </section>

        <section
          className={`rounded-3xl bg-white shadow-sm ${
            isSharedView
              ? "border-2 border-black/10 px-12 py-8 sm:px-14"
              : "border border-black/10 px-2 py-8 sm:px-3"
          }`}
        >
          <div className="space-y-5">
            {hasBodyContent ? (
              <EntryReaderRichText
                content={tiptapContent}
                media={entry.media}
                fallbackAlt={entry.title || t("entries.tripPhoto")}
                openImageLabel={t("entries.openPhoto")}
                onImageClick={openViewerAtUrl}
                resolveAltText={resolveAltText}
              />
            ) : (
              <p className="text-[17px] leading-7 text-[#6B635B]">
                {t('entries.noEntryText')}
              </p>
            )}
          </div>
        </section>

        {galleryItems.length > 0 ? (
          <MediaGallery
            items={galleryItems}
            onItemClick={openViewerAtUrl}
            onStartSlideshow={
              viewerImages.length > 0 ? startSlideshow : undefined
            }
          />
        ) : null}

        {entry.location && formatEntryLocationDisplay(entry.location) ? (
          <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                  {t("entries.entryLocationLabel")}
                </p>
                <p className="text-lg font-semibold text-[#2D2A26]">
                  {formatEntryLocationDisplay(entry.location)}
                </p>
              </div>
              {heroMapLocations && heroMapLocations.length > 0 ? (
                <div className="relative isolate">
                  <TripMap
                    ariaLabel={t("trips.tripMap")}
                    pinsLabel={t("trips.mapPins")}
                    locations={[
                      {
                        entryId: entry.id,
                        title: entry.title || t("entries.dailyEntry"),
                        location: entry.location,
                      },
                    ]}
                    boundsLocations={heroMapLocations.map((loc, idx) => ({
                      entryId: `trip-entry-${idx}`,
                      title: "",
                      location: loc,
                    }))}
                    selectedEntryId={entry.id}
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
              ) : null}
            </div>
          </section>
        ) : null}

        <nav className="grid gap-4 sm:grid-cols-2">
          {navigation.previousEntryId ? (
            <Link
              href={
                entryLinkBase
                  ? `${entryLinkBase}/${navigation.previousEntryId}`
                  : `/entries/${navigation.previousEntryId}`
              }
              aria-label={t('entries.previousEntry')}
              className="group rounded-2xl border border-black/10 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                {t('entries.previous')}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#2D2A26]">
                {previousLabel}
              </p>
            </Link>
          ) : (
            <div
              aria-label={t('entries.previousEntry')}
              data-disabled="true"
              className="rounded-2xl border border-black/5 bg-white/60 px-5 py-4 text-left text-[#6B635B] opacity-70"
            >
              <p className="text-xs uppercase tracking-[0.2em]">{t('entries.previous')}</p>
              <p className="mt-2 text-lg font-semibold">{t('entries.startOfTrip')}</p>
            </div>
          )}

          {navigation.nextEntryId ? (
            <Link
              href={
                entryLinkBase
                  ? `${entryLinkBase}/${navigation.nextEntryId}`
                  : `/entries/${navigation.nextEntryId}`
              }
              aria-label={t('entries.nextEntry')}
              className="group rounded-2xl border border-black/10 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                {t('entries.next')}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#2D2A26]">
                {nextLabel}
              </p>
            </Link>
          ) : (
            <div
              aria-label={t('entries.nextEntry')}
              data-disabled="true"
              className="rounded-2xl border border-black/5 bg-white/60 px-5 py-4 text-left text-[#6B635B] opacity-70"
            >
              <p className="text-xs uppercase tracking-[0.2em]">{t('entries.next')}</p>
              <p className="mt-2 text-lg font-semibold">{t('entries.endOfTrip')}</p>
            </div>
          )}
        </nav>

        <FullScreenPhotoViewer
          images={viewerImages}
          initialIndex={viewerIndex}
          isOpen={isViewerOpen}
          onClose={closeViewer}
          mode={viewerMode}
        />
      </main>
    </div>
  );
};

export default EntryReader;
