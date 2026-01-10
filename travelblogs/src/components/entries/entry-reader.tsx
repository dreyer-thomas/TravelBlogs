"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import MediaGallery from "../media/media-gallery";
import { DEFAULT_INLINE_ALT, parseEntryContent } from "../../utils/entry-content";
import type { EntryReaderData } from "../../utils/entry-reader";
import FullScreenPhotoViewer from "./full-screen-photo-viewer";
import { useTranslation } from "../../utils/use-translation";

type EntryReaderProps = {
  entry: EntryReaderData;
  entryLinkBase?: string;
  backToTripHref?: string;
};

const isOptimizedImage = (url: string) => url.startsWith("/");

const EntryReader = ({
  entry,
  entryLinkBase,
  backToTripHref,
}: EntryReaderProps) => {
  const { t, formatDate } = useTranslation();
  const resolveAltText = (alt?: string | null) => {
    if (!alt) {
      return null;
    }
    if (alt === DEFAULT_INLINE_ALT) {
      return t("entries.entryPhoto");
    }
    return alt;
  };

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
  const galleryItems = entry.media;
  const contentBlocks = useMemo(
    () => parseEntryContent(entry.body ?? ""),
    [entry.body],
  );
  const viewerImages = useMemo(() => {
    const images = new Map<string, { url: string; alt: string }>();

    entry.media.forEach((media) => {
      const resolvedAlt = resolveAltText(media.alt?.trim());
      images.set(media.url, {
        url: media.url,
        alt: resolvedAlt || entry.title || t("entries.tripPhoto"),
      });
    });

    contentBlocks.forEach((block) => {
      if (block.type !== "image") {
        return;
      }
      if (!images.has(block.url)) {
        images.set(block.url, {
          url: block.url,
          alt:
            resolveAltText(block.alt?.trim()) ||
            entry.title ||
            t("entries.tripPhoto"),
        });
      }
    });

    return Array.from(images.values());
  }, [contentBlocks, entry.media, entry.title, t]);
  const hasBodyContent =
    contentBlocks.some(
      (block) => block.type === "text" && block.value.trim(),
    ) || contentBlocks.some((block) => block.type === "image");
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
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            {formatDate(new Date(entry.createdAt))}
          </p>
          <h1 className="text-4xl font-semibold text-[#2D2A26] sm:text-5xl">
            {entry.title || t('entries.dailyEntry')}
          </h1>
        </header>

        <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          {heroMedia ? (
            <button
              type="button"
              onClick={() => openViewerAtUrl(heroMedia.url)}
              className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
              aria-label={t('entries.openHeroPhoto')}
            >
              <Image
                src={heroMedia.url}
                alt={heroMedia.alt ?? t('entries.entryHeroMedia')}
                width={heroMedia.width ?? 1600}
                height={heroMedia.height ?? 1000}
                sizes="(min-width: 1024px) 960px, 100vw"
                className="h-auto w-full object-cover"
                loading="lazy"
                unoptimized={!isOptimizedImage(heroMedia.url)}
              />
            </button>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center bg-[#F2ECE3] text-sm text-[#6B635B]">
              {t('entries.noMediaAvailable')}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-[42rem] space-y-5">
            {hasBodyContent ? (
              contentBlocks.map((block, index) => {
                if (block.type === "image") {
                  return (
                    <div
                      key={`entry-inline-image-${block.url}-${index}`}
                      className="overflow-hidden rounded-2xl border border-black/10 bg-[#F2ECE3]"
                    >
                      <button
                        type="button"
                        onClick={() => openViewerAtUrl(block.url)}
                        className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
                        aria-label={t('entries.openPhoto')}
                      >
                        <Image
                          src={block.url}
                          alt={resolveAltText(block.alt) || t("entries.entryPhoto")}
                          width={1200}
                          height={800}
                          sizes="100vw"
                          className="h-auto w-full object-cover"
                          loading="lazy"
                          unoptimized={!isOptimizedImage(block.url)}
                        />
                      </button>
                    </div>
                  );
                }

                return block.value
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, paragraphIndex) => (
                    <p
                      key={`entry-paragraph-${index}-${paragraphIndex}`}
                      className="text-[17px] leading-7 text-[#2D2A26]"
                    >
                      {paragraph}
                    </p>
                  ));
              })
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
