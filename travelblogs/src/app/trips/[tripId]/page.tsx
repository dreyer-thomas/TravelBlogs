import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { authOptions } from "../../../utils/auth-options";
import TripDetail from "../../../components/trips/trip-detail";
import { prisma } from "../../../utils/db";
import { canContributeToTrip, hasTripAccess } from "../../../utils/trip-access";

export const dynamic = "force-dynamic";

type TripDetailPageProps = {
  params: {
    tripId: string;
  } | Promise<{ tripId: string }>;
};

const TripDetailPage = async ({ params }: TripDetailPageProps) => {
  noStore();
  const { tripId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${tripId}`);
  }

  const trip = await prisma.trip.findUnique({
    where: {
      id: tripId,
    },
    select: {
      ownerId: true,
    },
  });

  if (!trip) {
    notFound();
  }

  const isOwner = trip.ownerId === session.user.id;
  if (!isOwner) {
    const canView = await hasTripAccess(tripId, session.user.id);
    if (!canView) {
      notFound();
    }
  }

  const canContribute = isOwner
    ? true
    : await canContributeToTrip(tripId, session.user.id);

  return (
    <TripDetail
      tripId={tripId}
      canAddEntry={canContribute}
      canEditTrip={canContribute}
      canDeleteTrip={isOwner}
      canManageShare={isOwner}
      canManageViewers={isOwner}
    />
  );
};

export default TripDetailPage;
