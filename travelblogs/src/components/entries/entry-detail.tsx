"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import {
  extractInlineImageUrls,
  getPhotoTimestamp,
  parseEntryContent,
} from "../../utils/entry-content";

type EntryMedia = {
  id: string;
  url: string;
  createdAt: string;
};

type EntryDetail = {
  id: string;
  tripId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  media: EntryMedia[];
};

type EntryDetailProps = {
  tripId: string;
  entryId: string;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const isOptimizedImage = (url: string) => url.startsWith("/");

const EntryDetail = ({ tripId, entryId }: EntryDetailProps) => {
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    const loadEntry = async () => {
      try {
        const response = await fetch(`/api/entries/${entryId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
          throw new Error(body?.error?.message ?? "Unable to load entry.");
        }

        if (isActive) {
          setEntry((body?.data as EntryDetail) ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setEntry(null);
          setError(
            err instanceof Error ? err.message : "Unable to load entry.",
          );
          setIsLoading(false);
        }
      }
    };

    loadEntry();

    return () => {
      isActive = false;
    };
  }, [entryId]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl space-y-6">
          <a
            href={`/trips/${tripId}`}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to trip
          </a>
          <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
            <p className="text-sm text-[#6B635B]">Loading entry…</p>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl space-y-6">
          <a
            href={`/trips/${tripId}`}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to trip
          </a>
          <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
            <p className="text-sm text-[#B34A3C]">{error}</p>
          </section>
        </main>
      </div>
    );
  }

  if (!entry) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <a
          href={`/trips/${tripId}`}
          className="text-sm text-[#1F6F78] hover:underline"
        >
          ← Back to trip
        </a>

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
              {formatDate(entry.createdAt)}
            </p>
            <h1 className="text-3xl font-semibold text-[#2D2A26]">
              Daily entry
            </h1>
            <p className="text-sm text-[#6B635B]">
              Updated {formatDate(entry.updatedAt)}
            </p>
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
                  <Image
                    src={block.url}
                    alt={block.alt || "Entry photo"}
                    width={1200}
                    height={800}
                    sizes="100vw"
                    className="h-auto w-full object-cover"
                    loading="lazy"
                    unoptimized={!isOptimizedImage(block.url)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
              Media
            </p>
            <h2 className="text-2xl font-semibold text-[#2D2A26]">
              Photos & moments
            </h2>
          </header>
          {galleryItems.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B635B]">
              No media attached to this entry.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {galleryItems.map((item) => (
                <div
                  key={item.id ?? item.url}
                  className="relative h-48 overflow-hidden rounded-2xl bg-[#F2ECE3]"
                >
                  <Image
                    src={item.url}
                    alt="Entry media"
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default EntryDetail;
