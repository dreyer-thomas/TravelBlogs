import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import TripOverview from "../../../../components/trips/trip-overview";
import SharedTripGuard from "../../../../components/trips/shared-trip-guard";
import SharedTripError from "../../../../components/trips/shared-trip-error";
import { getRequestBaseUrl } from "../../../../utils/request-base-url";
import type { EntryLocation } from "../../../../utils/entry-location";

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
  message?: string;
};

type ApiResponse = {
  data: {
    trip: TripOverviewTrip;
    entries: TripOverviewEntry[];
  } | null;
  error: ApiError | null;
};

const loadSharedTrip = async (
  baseUrl: string,
  token: string,
): Promise<ApiResponse> => {
  const response = await fetch(`${baseUrl}/api/trips/share/${token}`, {
    method: "GET",
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    return {
      data: null,
      error: {
        code: body?.error?.code ?? "UNKNOWN_ERROR",
        message: body?.error?.message ?? undefined,
      },
    };
  }

  return {
    data: (body?.data ?? null) as ApiResponse["data"],
    error: null,
  };
};

const SharedTripPage = async ({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) => {
  noStore();

  const { token } = await params;
  const headersList = await headers();
  const baseUrl = getRequestBaseUrl(headersList);

  if (!baseUrl) {
    return <SharedTripError type="host" />;
  }

  const { data, error } = await loadSharedTrip(baseUrl, token);

  if (error?.code === "NOT_FOUND") {
    notFound();
  }

  if (!data) {
    return <SharedTripError message={error?.message} type="load" />;
  }

  return (
    <SharedTripGuard token={token}>
      <TripOverview
        trip={data.trip}
        entries={data.entries}
        entryLinkBase={`/trips/share/${token}/entries`}
        backToTripsHref="/trips"
      />
    </SharedTripGuard>
  );
};

export default SharedTripPage;
