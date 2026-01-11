import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import FullscreenTripMap from "../../../../components/trips/fullscreen-trip-map";
import type { EntryLocation } from "../../../../utils/entry-location";
import { getLocaleFromAcceptLanguage, getTranslation } from "../../../../utils/i18n";

export const dynamic = "force-dynamic";

type TripOverviewEntry = {
  id: string;
  tripId: string;
  title: string;
  createdAt: string;
  coverImageUrl: string | null;
  media: { url: string }[];
  location?: EntryLocation | null;
};

type TripOverviewTrip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
};

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse = {
  data: {
    trip: TripOverviewTrip;
    entries: TripOverviewEntry[];
  } | null;
  error: ApiError | null;
};

const loadOverview = async (
  baseUrl: string,
  cookieHeader: string,
  tripId: string,
  t: (key: string) => string,
): Promise<ApiResponse> => {
  const response = await fetch(`${baseUrl}/api/trips/${tripId}/overview`, {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    return {
      data: null,
      error: {
        code: body?.error?.code ?? "UNKNOWN_ERROR",
        message: body?.error?.message ?? t("trips.unableLoadTripOverview"),
      },
    };
  }

  return {
    data: (body?.data ?? null) as ApiResponse["data"],
    error: null,
  };
};

const TripMapPage = async ({
  params,
}: {
  params: Promise<{ tripId: string }> | { tripId: string };
}) => {
  noStore();

  const { tripId } = await params;
  const headersList = await headers();
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const t = (key: string) => getTranslation(key, locale);
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${protocol}://${host}` : null;
  const cookieHeader = headersList.get("cookie") ?? "";

  if (!baseUrl) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-4xl">
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">
              {t("trips.unableDetermineHost")}
            </p>
          </section>
        </main>
      </div>
    );
  }

  const { data, error } = await loadOverview(baseUrl, cookieHeader, tripId, t);

  if (error?.code === "NOT_FOUND") {
    notFound();
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-4xl">
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">
              {error?.message ?? t("trips.unableLoadTrip")}
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-5xl">
        <FullscreenTripMap
          tripTitle={data.trip.title}
          entries={data.entries}
          entryLinkBase={`/trips/${tripId}/entries`}
          mapLabel={t("trips.tripMap")}
          pinsLabel={t("trips.mapPins")}
          emptyMessage={t("trips.noLocations")}
          backHref={`/trips/${tripId}/overview`}
          backLabel={t("trips.backToTrip")}
        />
      </main>
    </div>
  );
};

export default TripMapPage;
