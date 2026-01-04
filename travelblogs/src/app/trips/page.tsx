import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";

import { authOptions } from "../../utils/auth-options";
import UserMenu from "../../components/account/user-menu";
import TripCard from "../../components/trips/trip-card";

export const dynamic = "force-dynamic";

type TripListItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  updatedAt: string;
  canEditTrip: boolean;
};

const loadTrips = async (baseUrl: string, cookieHeader: string) => {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    throw new Error(body?.error?.message ?? "Unable to load trips.");
  }

  return (body?.data ?? []) as TripListItem[];
};

const TripsPage = async () => {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/trips");
  }

  const role = session.user.role ?? null;
  const isCreator = role === "creator";
  const isViewer = role === "viewer";
  const userEmail = session.user.email ?? "";

  if (!isCreator && !isViewer) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-4xl space-y-8">
          <header>
            <h1 className="text-3xl font-semibold text-[#2D2A26]">Trips</h1>
            <p className="mt-2 text-sm text-[#6B635B]">
              Your account does not have access to trips.
            </p>
          </header>
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">
              Access to this area is restricted.
            </p>
          </section>
        </main>
      </div>
    );
  }
  const headersList = await headers();
  const cookieHeader = headersList.get("cookie") ?? "";
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  let trips: TripListItem[] = [];
  let loadError: string | null = null;

  try {
    trips = await loadTrips(baseUrl, cookieHeader);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load trips.";
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#2D2A26]">
              {isViewer ? "Your trips" : "Manage trips"}
            </h1>
            <p className="mt-2 text-sm text-[#6B635B]">
              {isViewer
                ? "Trips you have been invited to will appear here."
                : "Start a new trip or revisit your existing plans."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isCreator ? (
              <>
                <Link
                  href="/admin/users"
                  className="rounded-xl border border-[#1F6F78]/30 px-4 py-2 text-sm font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/10"
                >
                  Manage users
                </Link>
                <Link
                  href="/trips/new"
                  className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
                >
                  Create trip
                </Link>
              </>
            ) : null}
            <div className="relative">
              <UserMenu
                name={session.user.name}
                email={userEmail}
                className="relative"
              />
            </div>
          </div>
        </header>

        {loadError ? (
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">{loadError}</p>
          </section>
        ) : trips.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-[#2D2A26]">
              {isViewer ? "No invited trips yet" : "No trips yet"}
            </h2>
            <p className="mt-2 text-sm text-[#6B635B]">
              {isViewer
                ? "When someone invites you to a trip, it will show up here."
                : "No trips yet. Create your first trip to start capturing your journey."}
            </p>
            {isCreator ? (
              <Link
                href="/trips/new"
                className="mt-4 inline-flex rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6F78]/40"
              >
                Create a trip
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

export default TripsPage;
