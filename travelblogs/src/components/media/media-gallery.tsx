"use client";

import { useRef } from "react";
import Image from "next/image";

export type MediaGalleryItem = {
  id?: string | null;
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

type MediaGalleryProps = {
  items: MediaGalleryItem[];
};

const SCROLL_AMOUNT = 320;

const isOptimizedImage = (url: string) => url.startsWith("/");

const MediaGallery = ({ items }: MediaGalleryProps) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

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
            Gallery
          </p>
          <h2 className="text-2xl font-semibold text-[#2D2A26]">
            More moments
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll("prev")}
            aria-label="Scroll gallery backward"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2D2A26]/15 bg-white text-lg text-[#2D2A26] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => handleScroll("next")}
            aria-label="Scroll gallery forward"
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
        {items.map((item) => (
          <figure
            key={item.id ?? item.url}
            className="snap-start shrink-0 basis-64 sm:basis-72 md:basis-80"
          >
            <div className="overflow-hidden rounded-2xl bg-[#F2ECE3]">
              <Image
                src={item.url}
                alt={item.alt ?? "Entry media"}
                width={item.width ?? 1200}
                height={item.height ?? 900}
                sizes="(min-width: 1024px) 320px, 70vw"
                className="h-auto w-full object-cover"
                loading="lazy"
                unoptimized={!isOptimizedImage(item.url)}
              />
            </div>
            {item.alt ? (
              <figcaption className="mt-3 text-sm text-[#6B635B]">
                {item.alt}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
};

export default MediaGallery;
