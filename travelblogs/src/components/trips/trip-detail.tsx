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

const isOptimizedImage = (url: string) => url.startsWith("/");

const TripDetail = ({ tripId }: TripDetailProps) => {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareRevoked, setShareRevoked] = useState(false);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

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

  useEffect(() => {
    let isActive = true;
    setShareError(null);
    setShareCopied(false);
    setShareRevoked(false);

    const loadShareLink = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/share-link`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 404) {
          if (isActive) {
            setShareLink(null);
          }
          return;
        }
        const body = await response.json().catch(() => null);
        if (!response.ok || body?.error) {
          throw new Error(body?.error?.message ?? "Unable to load share link.");
        }
        const shareUrl = body?.data?.shareUrl;
        if (isActive) {
          setShareLink(shareUrl ? (shareUrl as string) : null);
        }
      } catch (err) {
        if (isActive) {
          setShareError(
            err instanceof Error ? err.message : "Unable to load share link.",
          );
        }
      }
    };

    loadShareLink();

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

  const handleCreateShareLink = async () => {
    setShareLoading(true);
    setShareError(null);
    setShareCopied(false);
    setShareRevoked(false);

    try {
      const response = await fetch(`/api/trips/${trip.id}/share-link`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(body?.error?.message ?? "Unable to create share link.");
      }

      const shareUrl = body?.data?.shareUrl;
      if (!shareUrl) {
        throw new Error("Share link response was incomplete.");
      }

      setShareLink(shareUrl as string);
    } catch (err) {
      setShareError(
        err instanceof Error ? err.message : "Unable to create share link.",
      );
    } finally {
      setShareLoading(false);
    }
  };

  const handleOpenRevoke = () => {
    setIsRevokeOpen(true);
    setRevokeError(null);
  };

  const handleCloseRevoke = () => {
    setIsRevokeOpen(false);
    setIsRevoking(false);
    setRevokeError(null);
  };

  const handleRevokeShareLink = async () => {
    if (!shareLink) {
      return;
    }

    setIsRevoking(true);
    setRevokeError(null);

    try {
      const response = await fetch(`/api/trips/${trip.id}/share-link`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(body?.error?.message ?? "Unable to revoke share link.");
      }

      setShareLink(null);
      setShareRevoked(true);
      setShareCopied(false);
      setIsRevokeOpen(false);
      setIsRevoking(false);
    } catch (err) {
      setRevokeError(
        err instanceof Error ? err.message : "Unable to revoke share link.",
      );
      setIsRevoking(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(shareLink);
      setShareCopied(true);
      setShareError(null);
    } catch {
      setShareError("Unable to copy the share link.");
      setShareCopied(false);
    }
  };

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

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#6B635B]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#2D2A26]">Owner:</span>
              <span>Creator</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSharePanelOpen((prev) => !prev)}
              aria-label="Share trip"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B] transition hover:border-[#1F6F78]/40 hover:text-[#1F6F78]"
            >
              Share
            </button>
          </div>

          {isSharePanelOpen ? (
            <div className="mt-4 rounded-2xl border border-black/10 bg-[#FBF7F1] p-4 text-sm text-[#6B635B]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                Share link
              </p>
              <p className="mt-2">
                Create a read-only link for this trip.
              </p>

              {shareError ? (
                <p className="mt-3 text-sm text-[#B34A3C]">{shareError}</p>
              ) : null}

              {shareRevoked && !shareLink ? (
                <p className="mt-3">Link revoked.</p>
              ) : null}

              {shareLink ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="w-full flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#2D2A26]"
                    aria-label="Share URL"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="rounded-xl border border-[#1F6F78] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78] transition hover:bg-[#1F6F78] hover:text-white"
                  >
                    {shareCopied ? "Copied" : "Copy link"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateShareLink}
                  className="mt-3 rounded-xl bg-[#1F6F78] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={shareLoading}
                >
                  {shareLoading ? "Creating…" : "Generate link"}
                </button>
              )}
            </div>
          ) : null}
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
                        className="relative shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]"
                        style={{ width: 139, height: 97 }}
                      >
                        <Image
                          src={cardImageUrl}
                          alt={`Story cover for ${displayTitle}`}
                          fill
                          sizes="140px"
                          className="object-cover"
                          loading="lazy"
                          unoptimized={!isOptimizedImage(cardImageUrl)}
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

        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                Trip actions
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
              {shareLink ? (
                <button
                  type="button"
                  onClick={handleOpenRevoke}
                  className="rounded-xl border border-[#B64A3A] px-4 py-2 text-sm font-semibold text-[#B64A3A] transition hover:bg-[#B64A3A]/10"
                  disabled={shareLoading || isRevoking}
                >
                  Revoke share link
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      {isRevokeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-share-title"
            aria-describedby="revoke-share-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="revoke-share-title"
              className="text-lg font-semibold text-[#2D2A26]"
            >
              Revoke this link?
            </h2>
            <p
              id="revoke-share-description"
              className="mt-2 text-sm text-[#6B635B]"
            >
              Anyone using this link will lose access immediately.
            </p>

            {revokeError ? (
              <p className="mt-3 text-sm text-[#B64A3A]">{revokeError}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCloseRevoke}
                className="min-h-[44px] rounded-xl border border-[#D5CDC4] px-4 py-2 text-sm font-semibold text-[#2D2A26] transition hover:bg-[#F6F1EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
              >
                Keep link
              </button>
              <button
                type="button"
                onClick={handleRevokeShareLink}
                disabled={isRevoking}
                className="min-h-[44px] rounded-xl bg-[#B64A3A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9E3F31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B64A3A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRevoking ? "Revoking..." : "Yes, revoke"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TripDetail;
