"use client";

import { useTranslation } from "../../utils/use-translation";

export type TripExportItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
};

type TripsExportDashboardProps = {
  trips: TripExportItem[];
  showOwner: boolean;
};

const formatDateRange = (
  startDate: string,
  endDate: string,
  formatDate: (value: Date) => string,
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} – ${endDate}`;
  }

  return `${formatDate(start)} – ${formatDate(end)}`;
};

const getOwnerLabel = (trip: TripExportItem) => {
  if (trip.ownerName && trip.ownerEmail) {
    return `${trip.ownerName} (${trip.ownerEmail})`;
  }
  if (trip.ownerName) {
    return trip.ownerName;
  }
  if (trip.ownerEmail) {
    return trip.ownerEmail;
  }
  return trip.ownerId;
};

const TripsExportDashboard = ({ trips, showOwner }: TripsExportDashboardProps) => {
  const { t, formatDate } = useTranslation();

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="space-y-4">
        {trips.length === 0 ? (
          <p className="text-sm text-[#6B635B]">{t("admin.noTripsToExport")}</p>
        ) : (
          trips.map((trip) => (
            <article
              key={trip.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4 last:border-b-0 last:pb-0"
            >
              <div>
                <h2 className="text-base font-semibold text-[#2D2A26]">
                  {trip.title}
                </h2>
                <p className="mt-1 text-sm text-[#6B635B]">
                  {formatDateRange(trip.startDate, trip.endDate, formatDate)}
                </p>
                {showOwner ? (
                  <p className="mt-1 text-xs text-[#8A8178]">
                    {t("admin.tripOwnerId")} {getOwnerLabel(trip)}
                  </p>
                ) : null}
              </div>
              <a
                href={`/api/trips/${trip.id}/export`}
                className="inline-flex rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6F78]/40"
              >
                {t("admin.exportTrip")}
              </a>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

export default TripsExportDashboard;
