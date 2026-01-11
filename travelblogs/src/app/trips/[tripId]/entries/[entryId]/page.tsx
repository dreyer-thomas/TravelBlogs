import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { authOptions } from "../../../../../utils/auth-options";
import { prisma } from "../../../../../utils/db";
import EntryDetail from "../../../../../components/entries/entry-detail";
import { canContributeToTrip, hasTripAccess } from "../../../../../utils/trip-access";
import type { EntryLocation } from "../../../../../utils/entry-location";

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
  location?: EntryLocation | null;
};

type EntryMapLocation = {
  entryId: string;
  title: string;
  location: EntryLocation;
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

  if (!entry) {
    notFound();
  }

  const isOwner = entry.trip.ownerId === session.user.id;
  if (!isOwner) {
    const canView = await hasTripAccess(entry.tripId, session.user.id);
    if (!canView) {
      notFound();
    }
  }

  const canEdit = isOwner
    ? true
    : await canContributeToTrip(entry.tripId, session.user.id);
  const canDelete = isOwner;

  const location =
    entry.latitude !== null && entry.longitude !== null
      ? {
          latitude: entry.latitude,
          longitude: entry.longitude,
          label: entry.locationName,
        }
      : null;

  const tripEntries = await prisma.entry.findMany({
    where: { tripId },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      locationName: true,
    },
  });

  const tripLocations: EntryMapLocation[] = tripEntries.flatMap((item) => {
    if (item.latitude === null || item.longitude === null) {
      return [];
    }
    return [
      {
        entryId: item.id,
        title: item.title,
        location: {
          latitude: item.latitude,
          longitude: item.longitude,
          label: item.locationName,
        },
      },
    ];
  });

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
    location,
  };

  return (
    <EntryDetail
      entry={entryData}
      canEdit={canEdit}
      canDelete={canDelete}
      tripLocations={tripLocations}
    />
  );
};

export default EntryDetailPage;
