"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import DeleteEntryModal from "./delete-entry-modal";
import FullScreenPhotoViewer from "./full-screen-photo-viewer";
import {
  DEFAULT_INLINE_ALT,
  extractInlineImageUrls,
  findInlineImageAlt,
  getPhotoTimestamp,
  parseEntryContent,
} from "../../utils/entry-content";
import { useTranslation } from "../../utils/use-translation";

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
};

type EntryDetailProps = {
  entry: EntryData;
  canEdit: boolean;
  canDelete: boolean;
};

const isOptimizedImage = (url: string) => url.startsWith("/");

const EntryDetail = ({ entry, canEdit, canDelete }: EntryDetailProps) => {
  const { t, formatDate } = useTranslation();
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

  const contentBlocks = useMemo(
    () => (entry ? parseEntryContent(entry.text) : []),
    [entry],
  );
  const inlineImageUrls = useMemo(
    () => (entry ? extractInlineImageUrls(entry.text) : []),
    [entry],
  );
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
      alt: resolveAltText(findInlineImageAlt(entry.text, item.url)),
    }));
  }, [entry, galleryItems, resolveAltText]);

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

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                {formatDate(new Date(entry.createdAt))}
              </p>
              <h1 className="text-3xl font-semibold text-[#2D2A26]">
                {entry.title || t("entries.dailyEntry")}
              </h1>
            </div>
          </header>

          <div className="mt-6 space-y-4">
            {contentBlocks.map((block, index) => {
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
                  </button>
                </div>
              );
            })}
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
              {galleryItems.map((item) => (
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
                    <Image
                      src={item.url}
                      alt={t("entries.entryMedia")}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

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
