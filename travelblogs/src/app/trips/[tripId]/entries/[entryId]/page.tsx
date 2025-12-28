import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { authOptions } from "../../../../../utils/auth-options";
import EntryDetail from "../../../../../components/entries/entry-detail";

export const dynamic = "force-dynamic";

type EntryDetailPageProps = {
  params: {
    tripId: string;
    entryId: string;
  } | Promise<{ tripId: string; entryId: string }>;
};

const EntryDetailPage = async ({ params }: EntryDetailPageProps) => {
  noStore();
  const { tripId, entryId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${tripId}/entries/${entryId}`);
  }

  return <EntryDetail tripId={tripId} entryId={entryId} />;
};

export default EntryDetailPage;
