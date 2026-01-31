"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "../../utils/use-translation";
import UserMenu from "../account/user-menu";
import TripCard from "./trip-card";
import WorldMap from "./world-map";

type TripListItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  updatedAt: string;
  canEditTrip: boolean;
};

type TripsPageContentProps = {
  trips: TripListItem[];
  loadError: string | null;
  isViewer: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  userName: string | null | undefined;
  userEmail: string;
};

type TripsByCountry = Record<string, { id: string; title: string }[]>;

const TripsPageContent = ({
  trips,
  loadError,
  isViewer,
  isCreator,
  isAdmin,
  userName,
  userEmail,
}: TripsPageContentProps) => {
  const { t } = useTranslation();
  const [highlightedCountries, setHighlightedCountries] = useState<string[]>([]);
  const [tripsByCountry, setTripsByCountry] = useState<TripsByCountry>();

  useEffect(() => {
    let isActive = true;

    const loadWorldMapCountries = async () => {
      if (typeof fetch !== "function") {
        return;
      }

      try {
        const response = await fetch("/api/trips/world-map");
        if (!response.ok) {
          if (isActive) {
            setHighlightedCountries([]);
            setTripsByCountry(undefined);
          }
          return;
        }
        const payload = await response.json();
        const countries = Array.isArray(payload?.data?.countries)
          ? payload.data.countries
          : [];
        const countryTrips =
          payload?.data?.tripsByCountry &&
          typeof payload.data.tripsByCountry === "object"
            ? (payload.data.tripsByCountry as TripsByCountry)
            : undefined;
        if (isActive) {
          setHighlightedCountries(countries);
          setTripsByCountry(countryTrips);
        }
      } catch (error) {
        console.error("Failed to load trip map highlights", error);
        if (isActive) {
          setHighlightedCountries([]);
          setTripsByCountry(undefined);
        }
      }
    };

    loadWorldMapCountries();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#2D2A26]">
              {isViewer ? t('trips.yourTrips') : t('trips.manageTrips')}
            </h1>
            <p className="mt-2 text-sm text-[#6B635B]">
              {isViewer
                ? t('trips.tripsInvitedMessage')
                : t('trips.startNewTrip')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isCreator || isAdmin ? (
              <>
                <Link
                  href="/admin/users"
                  className="rounded-xl border border-[#1F6F78]/30 px-4 py-2 text-sm font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/10"
                >
                  {t('trips.manageUsers')}
                </Link>
                <Link
                  href="/trips/new"
                  className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
                >
                  {t('trips.createTrip')}
                </Link>
              </>
            ) : null}
            <div className="relative">
              <UserMenu
                name={userName}
                email={userEmail}
                className="relative"
              />
            </div>
          </div>
        </header>

        <WorldMap
          ariaLabel={t('trips.worldMap')}
          highlightedCountries={highlightedCountries}
          tripsByCountry={tripsByCountry}
        />

        {loadError ? (
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">{loadError}</p>
          </section>
        ) : trips.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-[#2D2A26]">
              {isViewer ? t('trips.noInvitedTripsYet') : t('trips.noTrips')}
            </h2>
            <p className="mt-2 text-sm text-[#6B635B]">
              {isViewer
                ? t('trips.whenInvited')
                : t('trips.noTripsYet')}
            </p>
            {isCreator || isAdmin ? (
              <Link
                href="/trips/new"
                className="mt-4 inline-flex rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6F78]/40"
              >
                {t('trips.createATrip')}
              </Link>
            ) : null}
          </section>
        ) : (
          <section className="grid gap-4">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                id={trip.id}
                title={trip.title}
                startDate={trip.startDate}
                endDate={trip.endDate}
                coverImageUrl={trip.coverImageUrl}
                canEditTrip={trip.canEditTrip}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default TripsPageContent;
