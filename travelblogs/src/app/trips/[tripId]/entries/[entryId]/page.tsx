import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { authOptions } from "../../../../../utils/auth-options";
import { prisma } from "../../../../../utils/db";
import EntryDetail from "../../../../../components/entries/entry-detail";

export const dynamic = "force-dynamic";

type EntryDetailPageProps = {
  params: {
    tripId: string;
    entryId: string;
  } | Promise<{ tripId: string; entryId: string }>;
};

type EntryMedia = {
  id: string;
  url: string;
  createdAt: string;
};

type EntryData = {
  id: string;
  tripId: string;
  title: string;
  coverImageUrl?: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
  media: EntryMedia[];
};

const EntryDetailPage = async ({ params }: EntryDetailPageProps) => {
  noStore();
  const { tripId, entryId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${tripId}/entries/${entryId}`);
  }

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { media: true, trip: true },
  });

  if (!entry || entry.trip.ownerId !== session.user.id) {
    notFound();
  }

  const entryData: EntryData = {
    id: entry.id,
    tripId: entry.tripId,
    title: entry.title,
    coverImageUrl: entry.coverImageUrl,
    text: entry.text,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    media: entry.media.map((item) => ({
      id: item.id,
      url: item.url,
      createdAt: item.createdAt.toISOString(),
    })),
  };

  return <EntryDetail entry={entryData} />;
};

export default EntryDetailPage;
