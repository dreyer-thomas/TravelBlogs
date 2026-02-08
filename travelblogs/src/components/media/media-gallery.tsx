"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { DEFAULT_INLINE_ALT } from "../../utils/entry-content";
import { getMediaTypeFromUrl, shouldOptimizeImageUrl } from "../../utils/media";
import { useTranslation } from "../../utils/use-translation";
import { generateVideoThumbnail } from "../../utils/video-thumbnail";

export type MediaGalleryItem = {
  id?: string | null;
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

type MediaGalleryProps = {
  items: MediaGalleryItem[];
  onItemClick?: (url: string) => void;
  onStartSlideshow?: () => void;
};

const SCROLL_AMOUNT = 320;

const isOptimizedImage = (url: string) => shouldOptimizeImageUrl(url);

const VideoThumbnail = ({
  url,
  alt,
}: {
  url: string;
  alt: string;
}) => {
  const [poster, setPoster] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let mounted = true;

    generateVideoThumbnail(url, 0.5)
      .then((thumbnailUrl) => {
        if (mounted) {
          console.log("Generated thumbnail for", url);
          setPoster(thumbnailUrl);
        }
      })
      .catch((error) => {
        console.error("Failed to generate video thumbnail for", url, ":", error);
        // If thumbnail generation fails, try to capture from the video element itself
        if (mounted && videoRef.current) {
          const video = videoRef.current;
          video.currentTime = 0.5;
        }
      });

    return () => {
      mounted = false;
    };
  }, [url]);

  const handleLoadedMetadata = () => {
    // If we don't have a poster yet, try to seek to 0.5 seconds to show a frame
    if (!poster && videoRef.current) {
      videoRef.current.currentTime = 0.5;
    }
  };

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={url}
        poster={poster ?? undefined}
        className="h-auto w-full object-cover"
        preload="metadata"
        muted
        playsInline
        aria-label={alt}
        onLoadedMetadata={handleLoadedMetadata}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/90">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-10 w-10 drop-shadow"
          fill="currentColor"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
};

const MediaGallery = ({
  items,
  onItemClick,
  onStartSlideshow,
}: MediaGalleryProps) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  const handleScroll = (direction: "prev" | "next") => {
    const offset = direction === "next" ? SCROLL_AMOUNT : -SCROLL_AMOUNT;
    scrollerRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            {t("entries.galleryLabel")}
          </p>
          <h2 className="text-2xl font-semibold text-[#2D2A26]">
            {t("entries.moreMoments")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onStartSlideshow ? (
            <button
              type="button"
              onClick={onStartSlideshow}
              className="rounded-xl border border-[#2D2A26]/20 bg-[#F2ECE3] px-3 py-2 text-sm font-semibold text-[#2D2A26] transition hover:bg-[#E8E0D4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
            >
              {t("entries.startSlideshow")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => handleScroll("prev")}
            aria-label={t("entries.scrollGalleryBackward")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2D2A26]/15 bg-white text-lg text-[#2D2A26] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => handleScroll("next")}
            aria-label={t("entries.scrollGalleryForward")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2D2A26]/15 bg-white text-lg text-[#2D2A26] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
          >
            →
          </button>
        </div>
      </header>

      <div
        ref={scrollerRef}
        data-testid="media-gallery-scroller"
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
      >
        {items.map((item) => {
          const caption = item.alt?.trim();
          const isDefaultCaption = caption === DEFAULT_INLINE_ALT;
          const showCaption = Boolean(caption && !isDefaultCaption);
          const resolvedAlt = isDefaultCaption || !caption
            ? t("entries.entryMedia")
            : caption;
          const mediaType = getMediaTypeFromUrl(item.url);
          const isVideo = mediaType === "video";

          const mediaContent = isVideo ? (
            <VideoThumbnail url={item.url} alt={resolvedAlt} />
          ) : (
            <Image
              src={item.url}
              alt={resolvedAlt}
              width={item.width ?? 1200}
              height={item.height ?? 900}
              sizes="(min-width: 1024px) 320px, 70vw"
              className="h-auto w-full object-cover"
              loading="lazy"
              unoptimized={!isOptimizedImage(item.url)}
            />
          );

          const media = onItemClick ? (
            <button
              type="button"
              onClick={() => onItemClick(item.url)}
              className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
              aria-label={isVideo ? t("entries.openVideo") : t("entries.openPhoto")}
            >
              {mediaContent}
            </button>
          ) : (
            mediaContent
          );

          return (
            <figure
              key={item.id ?? item.url}
              className="snap-start shrink-0 basis-64 sm:basis-72 md:basis-80"
            >
              <div className="overflow-hidden rounded-2xl bg-[#F2ECE3]">
                {media}
              </div>
              {showCaption ? (
                <figcaption className="mt-3 text-sm text-[#6B635B]">
                  {caption}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
    </section>
  );
};

export default MediaGallery;
