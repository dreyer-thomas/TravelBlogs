"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import DeleteEntryModal from "./delete-entry-modal";
import FullScreenPhotoViewer from "./full-screen-photo-viewer";
import TripMap from "../trips/trip-map";
import {
  DEFAULT_INLINE_ALT,
  extractInlineImageUrls,
  findInlineImageAlt,
  getPhotoTimestamp,
  parseEntryContent,
} from "../../utils/entry-content";
import {
  formatEntryLocationDisplay,
  type EntryLocation,
} from "../../utils/entry-location";
import { countryCodeToFlag, countryCodeToName } from "../../utils/country-flag";
import { detectEntryFormat, plainTextToTiptapJson } from "../../utils/entry-format";
import type { EntryReaderMedia } from "../../utils/entry-reader";
import { extractEntryImageNodesFromJson } from "../../utils/tiptap-image-helpers";
import { getMediaTypeFromUrl } from "../../utils/media";
import { useTranslation } from "../../utils/use-translation";
import EntryReaderRichText from "./entry-reader-rich-text";

type EntryMedia = {
  id: string;
  url: string;
  createdAt: string;
};

type EntryData = {
  id: string;
  tripId: string;
  title: string;
  coverImageUrl?: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
  media: EntryMedia[];
  location?: EntryLocation | null;
};

type EntryMapLocation = {
  entryId: string;
  title: string;
  location: EntryLocation;
};

type EntryDetailProps = {
  entry: EntryData;
  canEdit: boolean;
  canDelete: boolean;
  tripLocations?: EntryMapLocation[];
};

const isOptimizedImage = (url: string) => url.startsWith("/");

const EntryDetail = ({
  entry,
  canEdit,
  canDelete,
  tripLocations = [],
}: EntryDetailProps) => {
  const { t, formatDate, locale } = useTranslation();
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<"viewer" | "slideshow">(
    "viewer",
  );
  const resolveAltText = useCallback((alt?: string | null) => {
    if (!alt || alt === DEFAULT_INLINE_ALT) {
      return t("entries.entryPhoto");
    }
    return alt;
  }, [t]);

  const entryBody = entry?.text ?? "";
  const entryFormat = useMemo(
    () => detectEntryFormat(entryBody),
    [entryBody],
  );
  const entryMediaIdByUrl = useMemo(
    () => new Map(entry.media.map((item) => [item.url, item.id])),
    [entry.media],
  );
  const entryMediaById = useMemo(() => {
    const map = new Map<string, EntryMedia>();
    entry.media.forEach((item) => map.set(item.id, item));
    return map;
  }, [entry.media]);
  const tiptapContent = useMemo(() => {
    if (entryFormat === "tiptap") {
      return entryBody;
    }
    return plainTextToTiptapJson(entryBody, entryMediaIdByUrl);
  }, [entryBody, entryFormat, entryMediaIdByUrl]);
  const inlineImages = useMemo(
    () =>
      entryFormat === "tiptap"
        ? extractEntryImageNodesFromJson(tiptapContent)
        : [],
    [entryFormat, tiptapContent],
  );
  const inlineImageUrls = useMemo(() => {
    if (entryFormat === "plain") {
      return extractInlineImageUrls(entryBody);
    }
    return inlineImages
      .map((node) => {
        if (node.entryMediaId && entryMediaById.has(node.entryMediaId)) {
          return entryMediaById.get(node.entryMediaId)?.url ?? null;
        }
        return node.src ?? null;
      })
      .filter((url): url is string => Boolean(url));
  }, [entryBody, entryFormat, entryMediaById, inlineImages]);
  const inlineImageAltByUrl = useMemo(() => {
    if (entryFormat === "plain") {
      return null;
    }
    const map = new Map<string, string>();
    inlineImages.forEach((node) => {
      const url = node.entryMediaId
        ? entryMediaById.get(node.entryMediaId)?.url
        : node.src ?? null;
      if (!url || map.has(url)) {
        return;
      }
      const alt = node.alt?.trim();
      map.set(url, alt && alt.length > 0 ? alt : DEFAULT_INLINE_ALT);
    });
    return map;
  }, [entryFormat, entryMediaById, inlineImages]);
  const readerMedia = useMemo<EntryReaderMedia[]>(
    () =>
      entry.media.map((item) => ({
        id: item.id,
        url: item.url,
        type: null,
        width: null,
        height: null,
        alt: null,
      })),
    [entry.media],
  );

  const contentBlocks = useMemo(
    () => (entryFormat === "plain" ? parseEntryContent(entryBody) : []),
    [entryBody, entryFormat],
  );
  const locationDisplay = useMemo(
    () => formatEntryLocationDisplay(entry.location),
    [entry.location],
  );
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
  const entryMapLocations = useMemo(() => {
    if (!entry.location) {
      return [];
    }
    const title = entry.title?.trim()
      ? entry.title
      : t("entries.dailyEntry");
    return [
      {
        entryId: entry.id,
        title,
        location: entry.location,
      },
    ];
  }, [entry.id, entry.location, entry.title, t]);
  const galleryItems = useMemo(() => {
    if (!entry) {
      return [];
    }

    const items = new Map<
      string,
      { url: string; createdAt?: string; id?: string }
    >();

    entry.media.forEach((item) => {
      items.set(item.url, {
        url: item.url,
        createdAt: item.createdAt,
        id: item.id,
      });
    });

    inlineImageUrls.forEach((url) => {
      if (!items.has(url)) {
        items.set(url, { url });
      }
    });

    return Array.from(items.values()).sort((left, right) => {
      const leftTimestamp = getPhotoTimestamp(left.url, left.createdAt);
      const rightTimestamp = getPhotoTimestamp(right.url, right.createdAt);
      return leftTimestamp - rightTimestamp;
    });
  }, [entry, inlineImageUrls]);
  const viewerImages = useMemo(() => {
    if (!entry) {
      return [];
    }
    return galleryItems.map((item) => ({
      url: item.url,
      alt: resolveAltText(
        entryFormat === "tiptap"
          ? inlineImageAltByUrl?.get(item.url) ?? null
          : findInlineImageAlt(entryBody, item.url),
      ),
    }));
  }, [entry, entryBody, entryFormat, galleryItems, inlineImageAltByUrl, resolveAltText]);

  const openViewerAtUrl = useCallback(
    (url: string) => {
      if (viewerImages.length === 0) {
        return;
      }
      const index = viewerImages.findIndex((item) => item.url === url);
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
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link
          href={`/trips/${entry.tripId}`}
          className="text-sm text-[#1F6F78] hover:underline"
        >
          ← {t("entries.backToTrip")}
        </Link>

        <section className="rounded-2xl border border-black/10 bg-white px-2 py-8 shadow-sm sm:px-3">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                {formatDate(new Date(entry.createdAt))}
              </p>
              {countryFlag ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-lg text-[#2D2A26]">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {countryFlag}
                  </span>
                  {countryName ? <span>{countryName}</span> : null}
                </div>
              ) : null}
              <h1 className="mt-1 text-3xl font-semibold text-[#2D2A26]">
                {entry.title || t("entries.dailyEntry")}
              </h1>
            </div>
          </header>

          <div className="mt-6 space-y-4">
            {entryFormat === "tiptap" ? (
              <EntryReaderRichText
                content={tiptapContent}
                media={readerMedia}
                fallbackAlt={entry.title || t("entries.tripPhoto")}
                openImageLabel={t("entries.openPhoto")}
                onImageClick={openViewerAtUrl}
                resolveAltText={resolveAltText}
              />
            ) : (
              contentBlocks.map((block, index) => {
                if (block.type === "text") {
                  if (!block.value.trim()) {
                    return null;
                  }
                  return (
                    <p
                      key={`text-${index}`}
                      className="whitespace-pre-wrap text-sm text-[#2D2A26]"
                    >
                      {block.value}
                    </p>
                  );
                }

                const isVideo = getMediaTypeFromUrl(block.url) === "video";

                return (
                  <div
                    key={`image-${block.url}-${index}`}
                    className="overflow-hidden rounded-2xl border border-black/10 bg-[#F2ECE3]"
                  >
                    <button
                      type="button"
                      onClick={() => openViewerAtUrl(block.url)}
                      className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
                      aria-label={`${t("entries.openPhoto")} ${
                        viewerImages.findIndex(
                          (item) => item.url === block.url,
                        ) + 1
                      }`}
                    >
                      {isVideo ? (
                        <video
                          src={block.url}
                          className="h-auto w-full object-cover"
                          preload="metadata"
                          muted
                          playsInline
                          onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            video.currentTime = 0.5;
                          }}
                        />
                      ) : (
                        <Image
                          src={block.url}
                          alt={resolveAltText(block.alt)}
                          width={1200}
                          height={800}
                          sizes="100vw"
                          className="h-auto w-full object-cover"
                          loading="lazy"
                          unoptimized={!isOptimizedImage(block.url)}
                        />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                {t("entries.mediaLabel")}
              </p>
              <h2 className="text-2xl font-semibold text-[#2D2A26]">
                {t("entries.photosMoments")}
              </h2>
            </div>
            {galleryItems.length > 0 ? (
              <button
                type="button"
                onClick={startSlideshow}
                className="rounded-xl border border-[#2D2A26]/20 bg-[#F2ECE3] px-4 py-2 text-sm font-semibold text-[#2D2A26] transition hover:bg-[#E8E0D4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
              >
                {t("entries.startSlideshow")}
              </button>
            ) : null}
          </header>
          {galleryItems.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B635B]">
              {t("entries.noMediaAttached")}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {galleryItems.map((item) => {
                const isVideo = getMediaTypeFromUrl(item.url) === "video";
                return (
                  <div
                    key={item.id ?? item.url}
                    className="relative h-48 overflow-hidden rounded-2xl bg-[#F2ECE3]"
                  >
                    <button
                      type="button"
                      onClick={() => openViewerAtUrl(item.url)}
                      className="relative h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
                      aria-label={`${t("entries.openPhoto")} ${
                        viewerImages.findIndex(
                          (photo) => photo.url === item.url,
                        ) + 1
                      }`}
                    >
                      {isVideo ? (
                        <video
                          src={item.url}
                          className="h-full w-full object-cover"
                          preload="metadata"
                          muted
                          playsInline
                          onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            video.currentTime = 0.5;
                          }}
                        />
                      ) : (
                        <Image
                          src={item.url}
                          alt={t("entries.entryMedia")}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {locationDisplay ? (
          <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                  {t("entries.entryLocationLabel")}
                </p>
                <p className="text-lg font-semibold text-[#2D2A26]">
                  {locationDisplay}
                </p>
              </div>
              {entryMapLocations.length > 0 ? (
                <TripMap
                  ariaLabel={t("entries.entryLocationMap")}
                  pinsLabel={t("trips.mapPins")}
                  locations={entryMapLocations}
                  boundsLocations={tripLocations}
                  selectedEntryId={entry.id}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {canEdit || canDelete ? (
          <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                  {t("entries.entryActions")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canEdit ? (
                  <Link
                    href={`/trips/${entry.tripId}/entries/${entry.id}/edit`}
                    className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
                  >
                    {t("entries.edit")}
                  </Link>
                ) : null}
                {canDelete ? (
                  <DeleteEntryModal
                    tripId={entry.tripId}
                    entryId={entry.id}
                    entryTitle={entry.title}
                  />
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

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

export default EntryDetail;
