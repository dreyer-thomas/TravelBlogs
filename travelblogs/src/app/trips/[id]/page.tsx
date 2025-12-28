import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { authOptions } from "../../../utils/auth-options";
import TripDetail from "../../../components/trips/trip-detail";

export const dynamic = "force-dynamic";

type TripDetailPageProps = {
  params: {
    id: string;
  } | Promise<{ id: string }>;
};

const TripDetailPage = async ({ params }: TripDetailPageProps) => {
  noStore();
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${id}`);
  }
  return <TripDetail tripId={id} />;
};

export default TripDetailPage;
