import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import EditTripForm from "../../../../components/trips/edit-trip-form";
import EditTripHeader from "../../../../components/trips/edit-trip-header";
import { prisma } from "../../../../utils/db";
import { authOptions } from "../../../../utils/auth-options";
import { canContributeToTrip } from "../../../../utils/trip-access";

type EditTripPageProps = {
  params: {
    tripId: string;
  } | Promise<{ tripId: string }>;
};

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const EditTripPage = async ({ params }: EditTripPageProps) => {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${tripId}/edit`);
  }
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
    },
  });

  if (!trip) {
    notFound();
  }

  const isOwner = trip.ownerId === session.user.id;
  if (!isOwner) {
    const canContribute = await canContributeToTrip(
      trip.id,
      session.user.id,
    );
    if (!canContribute) {
      notFound();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <EditTripHeader tripId={trip.id} />

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
