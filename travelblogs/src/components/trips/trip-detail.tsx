"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import DeleteTripModal from "./delete-trip-modal";
import { isCoverImageUrl } from "../../utils/media";

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

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const TripDetail = ({ tripId }: TripDetailProps) => {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl space-y-6">
          <a href="/trips" className="text-sm text-[#1F6F78] hover:underline">
            ← Back to trips
          </a>
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
          <a href="/trips" className="text-sm text-[#1F6F78] hover:underline">
            ← Back to trips
          </a>
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
        <a href="/trips" className="text-sm text-[#1F6F78] hover:underline">
          ← Back to trips
        </a>

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
              <a
                href={`/trips/${trip.id}/edit`}
                className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
              >
                Edit trip
              </a>
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
      </main>
    </div>
  );
};

export default TripDetail;
