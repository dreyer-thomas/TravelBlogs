import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { prisma } from "../../utils/db";
import { authOptions } from "../../utils/auth-options";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const TripsPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/trips");
  }
  const ownerId = session.user.id;

  const trips = await prisma.trip.findMany({
    where: {
      ownerId,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
              Your Trips
            </p>
            <h1 className="text-3xl font-semibold text-[#2D2A26]">
              Manage trips
            </h1>
            <p className="mt-2 text-sm text-[#6B635B]">
              Start a new trip or revisit your existing plans.
            </p>
          </div>
          <Link
            href="/trips/new"
            className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
          >
            Create trip
          </Link>
        </header>

        {trips.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-[#2D2A26]">
              No trips yet
            </h2>
            <p className="mt-2 text-sm text-[#6B635B]">
              Create your first trip to start capturing memories.
            </p>
            <Link
              href="/trips/new"
              className="mt-4 inline-flex rounded-xl border border-[#1F6F78] px-4 py-2 text-sm font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/10"
            >
              Create your first trip
            </Link>
          </section>
        ) : (
          <section className="grid gap-4">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="rounded-2xl border border-black/10 bg-white p-5 transition hover:border-[#1F6F78]/40 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#2D2A26]">
                      {trip.title}
                    </h2>
                    <p className="mt-1 text-sm text-[#6B635B]">
                      {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F2ECE3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
                    Active
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default TripsPage;
