import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import EditTripForm from "../../../../components/trips/edit-trip-form";
import { prisma } from "../../../../utils/db";
import { authOptions } from "../../../../utils/auth-options";

type EditTripPageProps = {
  params: {
    id: string;
  } | Promise<{ id: string }>;
};

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const EditTripPage = async ({ params }: EditTripPageProps) => {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${id}/edit`);
  }
  const ownerId = session.user.id;

  const trip = await prisma.trip.findFirst({
    where: {
      id,
      ownerId,
    },
  });

  if (!trip) {
    notFound();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2">
          <Link
            href={`/trips/${trip.id}`}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to trip
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            Trip Setup
          </p>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            Edit trip details
          </h1>
          <p className="text-sm text-[#6B635B]">
            Update the basics so your trip info stays accurate.
          </p>
        </header>

        <EditTripForm
          tripId={trip.id}
          initialValues={{
            title: trip.title,
            startDate: formatDateInput(trip.startDate),
            endDate: formatDateInput(trip.endDate),
            coverImageUrl: trip.coverImageUrl ?? "",
          }}
        />
      </main>
    </div>
  );
};

export default EditTripPage;
