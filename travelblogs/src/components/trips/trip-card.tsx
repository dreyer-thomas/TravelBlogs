"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { isCoverImageUrl } from "../../utils/media";
import { useTranslation } from "../../utils/use-translation";

type TripCardProps = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  canEditTrip: boolean;
  tags: string[];
};

const toUtcDateOnly = (value: Date) =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

const parseUtcDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hasTimeZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed);
  const normalized = hasTimeZone
    ? trimmed
    : trimmed.includes("T")
      ? `${trimmed}Z`
      : `${trimmed}T00:00:00Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
};

const isTripActiveToday = (
  startDate: string,
  endDate: string,
  now: Date = new Date(),
) => {
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);

  if (!start || !end) {
    return false;
  }

  const todayUtc = toUtcDateOnly(now);
  const startUtc = toUtcDateOnly(start);
  const endUtc = toUtcDateOnly(end);

  return todayUtc >= startUtc && todayUtc <= endUtc;
};

const TripCard = ({
  id,
  title,
  startDate,
  endDate,
  coverImageUrl,
  canEditTrip,
  tags,
}: TripCardProps) => {
  const router = useRouter();
  const { t, formatDate: formatDateLocalized } = useTranslation();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const isActive = isTripActiveToday(startDate, endDate);

  const openSharedView = (shareUrl: string) => {
    if (shareUrl.startsWith("/")) {
      router.push(shareUrl);
      return;
    }
    try {
      const url = new URL(shareUrl);
      router.push(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      router.push(shareUrl);
    }
  };

  const handleOpenSharedView = async () => {
    if (viewLoading) {
      return;
    }

    setViewError(null);

    if (shareLink) {
      openSharedView(shareLink);
      return;
    }

    setViewLoading(true);

    try {
      const response = await fetch(`/api/trips/${id}/share-link`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(body?.error?.message ?? "Unable to open shared view.");
      }

      const shareUrl = body?.data?.shareUrl;
      if (!shareUrl) {
        throw new Error("Share link response was incomplete.");
      }

      setShareLink(shareUrl as string);
      openSharedView(shareUrl as string);
    } catch (err) {
      setViewError(
        err instanceof Error ? err.message : "Unable to open shared view.",
      );
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <article className="group rounded-2xl border border-black/10 bg-white p-5 transition hover:border-[#1F6F78]/40 hover:shadow-sm">
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={handleOpenSharedView}
          disabled={viewLoading}
          data-testid={`trip-card-${id}`}
          aria-label={`Open shared view for ${title}`}
          className="flex flex-1 items-center gap-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6F78]/40 disabled:cursor-not-allowed"
        >
          <div className="relative h-20 w-28 overflow-hidden rounded-xl bg-[#F2ECE3]">
            {coverImageUrl && isCoverImageUrl(coverImageUrl) ? (
              <Image
                src={coverImageUrl}
                alt={`Cover for ${title}`}
                fill
                sizes="112px"
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
                Trip
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#2D2A26]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[#6B635B]">
              {formatDateLocalized(new Date(startDate))} – {formatDateLocalized(new Date(endDate))}
            </p>
            {tags.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2" data-testid="trip-card-tags">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    title={tag}
                    data-testid="trip-card-tag"
                    className="inline-flex max-w-[12rem] items-center rounded-full bg-[#F2ECE3] px-3 py-1 text-xs font-semibold text-[#2D2A26] sm:max-w-[16rem]"
                  >
                    <span className="truncate" dir="auto">{tag}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {viewError ? (
              <p className="mt-2 text-xs text-[#B34A3C]">{viewError}</p>
            ) : null}
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenSharedView();
            }}
            disabled={viewLoading}
            className="rounded-xl bg-[#1F6F78] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {viewLoading ? t('common.loading') : t('common.view')}
          </button>
          {canEditTrip ? (
            <Link
              href={`/trips/${id}`}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Edit ${title}`}
              className="rounded-xl border border-[#1F6F78] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78] transition hover:bg-[#1F6F78] hover:text-white"
            >
              {t('common.edit')}
            </Link>
          ) : null}
          {isActive ? (
            <span className="rounded-full bg-[#F2ECE3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
              {t('common.active')}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default TripCard;
