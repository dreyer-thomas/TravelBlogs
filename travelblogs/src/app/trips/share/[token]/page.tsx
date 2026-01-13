import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";

import TripOverview from "../../../../components/trips/trip-overview";
import SharedTripGuard from "../../../../components/trips/shared-trip-guard";
import SharedTripError from "../../../../components/trips/shared-trip-error";
import { getRequestBaseUrl } from "../../../../utils/request-base-url";
import { authOptions } from "../../../../utils/auth-options";
import type { TripOverviewEntry, TripOverviewTrip } from "../../../../types/trip-overview";

export const dynamic = "force-dynamic";

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

  // Check if user is authenticated - show back link only for logged-in users
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user?.id;

  return (
    <SharedTripGuard token={token}>
      <TripOverview
        trip={data.trip}
        entries={data.entries}
        entryLinkBase={`/trips/share/${token}/entries`}
        backToTripsHref={isAuthenticated ? "/trips" : undefined}
        mapHref={`/trips/share/${token}/map`}
      />
    </SharedTripGuard>
  );
};

export default SharedTripPage;
