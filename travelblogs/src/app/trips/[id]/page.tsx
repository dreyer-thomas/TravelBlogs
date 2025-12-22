import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import DeleteTripModal from "../../../components/trips/delete-trip-modal";
import { prisma } from "../../../utils/db";
import { authOptions } from "../../../utils/auth-options";

type TripDetailPageProps = {
  params: {
    id: string;
  };
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const TripDetailPage = async ({ params }: TripDetailPageProps) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${params.id}`);
  }
  const ownerId = session.user.id;

  const trip = await prisma.trip.findFirst({
    where: {
      id: params.id,
      ownerId,
    },
  });

  if (!trip) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/trips" className="text-sm text-[#1F6F78] hover:underline">
          ← Back to trips
        </Link>

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
              <Link
                href={`/trips/${trip.id}/edit`}
                className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
              >
                Edit trip
              </Link>
              <DeleteTripModal tripId={trip.id} tripTitle={trip.title} />
            </div>
          </header>

          <div className="mt-6 space-y-3 text-sm text-[#6B635B]">
            <div>
              <span className="font-semibold text-[#2D2A26]">Owner:</span>{" "}
              Creator
            </div>
            {trip.coverImageUrl ? (
              <div>
                <span className="font-semibold text-[#2D2A26]">
                  Cover image:
                </span>{" "}
                <a
                  href={trip.coverImageUrl}
                  className="text-[#1F6F78] hover:underline"
                >
                  {trip.coverImageUrl}
                </a>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
};

export default TripDetailPage;
