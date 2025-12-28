import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { authOptions } from "../../../utils/auth-options";
import TripDetail from "../../../components/trips/trip-detail";

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
  return <TripDetail tripId={tripId} />;
};

export default TripDetailPage;
