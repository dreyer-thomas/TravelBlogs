"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import DeleteTripModal from "./delete-trip-modal";
import { isCoverImageUrl } from "../../utils/media";
import { extractInlineImageUrls, stripInlineImages } from "../../utils/entry-content";

type TripDetail = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
};

type TripDetailProps = {
  tripId: string;
};

type EntryMedia = {
  id: string;
  url: string;
  createdAt: string;
};

type EntrySummary = {
  id: string;
  tripId: string;
  title: string;
  coverImageUrl?: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
  media: EntryMedia[];
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatEntryDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const TripDetail = ({ tripId }: TripDetailProps) => {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    const loadTrip = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
          throw new Error(body?.error?.message ?? "Unable to load trip.");
        }

        if (isActive) {
          setTrip((body?.data as TripDetail) ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setTrip(null);
          setError(
            err instanceof Error ? err.message : "Unable to load trip.",
          );
          setIsLoading(false);
        }
      }
    };

    loadTrip();

    return () => {
      isActive = false;
    };
  }, [tripId]);

  useEffect(() => {
    let isActive = true;
    setEntriesLoading(true);
    setEntriesError(null);

    const loadEntries = async () => {
      try {
        const response = await fetch(`/api/entries?tripId=${tripId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
          throw new Error(body?.error?.message ?? "Unable to load entries.");
        }

        if (isActive) {
          setEntries((body?.data as EntrySummary[]) ?? []);
          setEntriesLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setEntries([]);
          setEntriesError(
            err instanceof Error ? err.message : "Unable to load entries.",
          );
          setEntriesLoading(false);
        }
      }
    };

    loadEntries();

    return () => {
      isActive = false;
    };
  }, [tripId]);

  const entriesByDate = useMemo(() => {
    return [...entries].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }, [entries]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl space-y-6">
          <Link
            href="/trips"
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to trips
          </Link>
          <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
            <p className="text-sm text-[#6B635B]">Loading trip…</p>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl space-y-6">
          <Link
            href="/trips"
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to trips
          </Link>
          <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
            <p className="text-sm text-[#B34A3C]">{error}</p>
          </section>
        </main>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/trips" className="text-sm text-[#1F6F78] hover:underline">
          ← Back to trips
        </Link>

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                Trip overview
              </p>
              <h1 className="text-3xl font-semibold text-[#2D2A26]">
                {trip.title}
              </h1>
              <p className="text-sm text-[#6B635B]">
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/trips/${trip.id}/edit`}
                className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
              >
                Edit trip
              </Link>
              <DeleteTripModal tripId={trip.id} tripTitle={trip.title} />
            </div>
          </header>

          {trip.coverImageUrl && isCoverImageUrl(trip.coverImageUrl) ? (
            <div className="relative mt-6 h-56 w-full overflow-hidden rounded-2xl bg-[#F2ECE3]">
              <Image
                src={trip.coverImageUrl}
                alt={`Cover for ${trip.title}`}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
                loading="lazy"
              />
            </div>
          ) : null}

          <div className="mt-6 space-y-3 text-sm text-[#6B635B]">
            <div>
              <span className="font-semibold text-[#2D2A26]">Owner:</span>{" "}
              Creator
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={`/trips/${trip.id}/entries/new`}
              className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
            >
              Add story
            </Link>
          </div>

          {entriesLoading ? (
            <p className="mt-4 text-sm text-[#6B635B]">Loading entries…</p>
          ) : entriesError ? (
            <p className="mt-4 text-sm text-[#B34A3C]">{entriesError}</p>
          ) : entriesByDate.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B635B]">
              No entries yet. Use the add story button to get started.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {entriesByDate.map((entry) => {
                const preview = stripInlineImages(entry.text);
                const inlineImages = extractInlineImageUrls(entry.text);
                const previewText =
                  preview.length === 0
                    ? "Photo update"
                    : preview.length > 120
                      ? `${preview.slice(0, 120)}…`
                      : preview;
                const displayTitle = entry.title?.trim()
                  ? entry.title
                  : previewText;
                const cardImageUrl =
                  entry.coverImageUrl?.trim() ||
                  entry.media[0]?.url ||
                  inlineImages[0];

                return (
                  <Link
                    key={entry.id}
                    href={`/trips/${trip.id}/entries/${entry.id}`}
                    className="flex items-center gap-4 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-[#1F6F78]/40 hover:shadow-sm"
                  >
                    {cardImageUrl ? (
                      <div
                        className="shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]"
                        style={{ width: 139, height: 97 }}
                      >
                        <img
                          src={cardImageUrl}
                          alt={`Story cover for ${displayTitle}`}
                          className="block h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                        {formatEntryDate(entry.createdAt)}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#2D2A26]">
                        {displayTitle}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78]">
                      Open
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TripDetail;
