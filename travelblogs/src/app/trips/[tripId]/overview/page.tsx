import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import TripOverview from "../../../../components/trips/trip-overview";

export const dynamic = "force-dynamic";

type TripOverviewEntry = {
  id: string;
  tripId: string;
  title: string;
  createdAt: string;
  coverImageUrl: string | null;
  media: { url: string }[];
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
  tripId: string,
): Promise<ApiResponse> => {
  const response = await fetch(`${baseUrl}/api/trips/${tripId}/overview`, {
    method: "GET",
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    return {
      data: null,
      error: {
        code: body?.error?.code ?? "UNKNOWN_ERROR",
        message: body?.error?.message ?? "Unable to load trip overview.",
      },
    };
  }

  return {
    data: (body?.data ?? null) as ApiResponse["data"],
    error: null,
  };
};

const TripOverviewPage = async ({
  params,
}: {
  params: Promise<{ tripId: string }> | { tripId: string };
}) => {
  noStore();

  const { tripId } = await params;
  const headersList = await headers();
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${protocol}://${host}` : null;

  if (!baseUrl) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl">
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">
              Unable to determine the host for this request.
            </p>
          </section>
        </main>
      </div>
    );
  }

  const { data, error } = await loadOverview(baseUrl, tripId);

  if (error?.code === "NOT_FOUND") {
    notFound();
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl">
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">
              {error?.message ?? "Unable to load this trip."}
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <TripOverview
      trip={data.trip}
      entries={data.entries}
      backToTripsHref="/trips"
    />
  );
};

export default TripOverviewPage;
