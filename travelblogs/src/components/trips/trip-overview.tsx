"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "../../utils/use-translation";

type TripOverviewTrip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
};

type TripOverviewEntry = {
  id: string;
  tripId: string;
  title: string;
  createdAt: string;
  coverImageUrl: string | null;
  media: { url: string }[];
};

type TripOverviewProps = {
  trip: TripOverviewTrip;
  entries: TripOverviewEntry[];
  linkEntries?: boolean;
  entryLinkBase?: string;
  backToTripsHref?: string;
};

const isOptimizedImage = (url: string) => url.startsWith("/");

const getPreviewImage = (entry: TripOverviewEntry) => {
  return (
    entry.coverImageUrl?.trim() ||
    entry.media[0]?.url ||
    "/window.svg"
  );
};

const TripOverview = ({
  trip,
  entries,
  linkEntries = true,
  entryLinkBase,
  backToTripsHref,
}: TripOverviewProps) => {
  const { t, locale } = useTranslation();

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        {backToTripsHref ? (
          <Link
            href={backToTripsHref}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← {t('trips.backToTrips')}
          </Link>
        ) : null}
        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
              {t('trips.tripOverview')}
            </p>
            <h1 className="text-3xl font-semibold text-[#2D2A26]">
              {trip.title}
            </h1>
            <p className="text-sm text-[#6B635B]">
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </p>
          </header>

          {trip.coverImageUrl ? (
            <div className="relative mt-6 h-64 w-full overflow-hidden rounded-2xl bg-[#F2ECE3]">
              <Image
                src={trip.coverImageUrl}
                alt={`${t('trips.coverFor')} ${trip.title}`}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
                loading="lazy"
                unoptimized={!isOptimizedImage(trip.coverImageUrl)}
              />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                {t('trips.latestEntries')}
              </p>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B635B]">
              {t('trips.noEntriesYet')}
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {entries.map((entry) => {
                const previewImage = getPreviewImage(entry);
                const content = (
                  <>
                    <div
                      className="relative h-[96px] w-[140px] shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]"
                      aria-hidden
                    >
                      <Image
                        src={previewImage}
                        alt={`${t('trips.previewFor')} ${entry.title}`}
                        fill
                        sizes="140px"
                        className="object-cover"
                        loading="lazy"
                        unoptimized={!isOptimizedImage(previewImage)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                        {formatDate(entry.createdAt)}
                      </p>
                      <p className="mt-1 text-base font-semibold text-[#2D2A26]">
                        {entry.title}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78]">
                      {t('trips.read')}
                    </span>
                  </>
                );

                if (linkEntries) {
                  const entryHref = entryLinkBase
                    ? `${entryLinkBase}/${entry.id}`
                    : `/entries/${entry.id}`;
                  return (
                    <Link
                      key={entry.id}
                      href={entryHref}
                      className="flex flex-wrap items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 transition hover:border-[#1F6F78]/40 hover:shadow-sm"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-black/10 bg-white p-4"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TripOverview;
