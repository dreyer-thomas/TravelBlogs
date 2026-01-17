import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import EditEntryForm from "../../../../../../components/entries/edit-entry-form";
import { prisma } from "../../../../../../utils/db";
import { authOptions } from "../../../../../../utils/auth-options";
import { canContributeToTrip } from "../../../../../../utils/trip-access";
import { getLocaleFromAcceptLanguage, getTranslation } from "../../../../../../utils/i18n";

type EditEntryPageProps = {
  params: {
    tripId: string;
    entryId: string;
  } | Promise<{ tripId: string; entryId: string }>;
};

const EditEntryPage = async ({ params }: EditEntryPageProps) => {
  const { tripId, entryId } = await params;
  const session = await getServerSession(authOptions);
  const headersList = await headers();
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const t = (key: string) => getTranslation(key, locale);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${tripId}/entries/${entryId}/edit`);
  }
  const entry = await prisma.entry.findFirst({
    where: {
      id: entryId,
      tripId,
    },
    include: {
      media: true,
      trip: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!entry) {
    notFound();
  }

  const isOwner = entry.trip.ownerId === session.user.id;
  if (!isOwner) {
    const canContribute = await canContributeToTrip(
      entry.tripId,
      session.user.id,
    );
    if (!canContribute) {
      notFound();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2">
          <Link
            href={`/trips/${tripId}/entries/${entryId}`}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← {t("entries.backToEntry")}
          </Link>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            {t("entries.editStory")}
          </h1>
        </header>

        <EditEntryForm
          tripId={tripId}
          entryId={entryId}
          initialEntryDate={entry.createdAt.toISOString()}
          initialTitle={entry.title}
          initialCoverImageUrl={entry.coverImageUrl}
          initialText={entry.text}
          initialMediaUrls={entry.media.map((item) => item.url)}
          initialMedia={entry.media.map((item) => ({
            id: item.id,
            url: item.url,
          }))}
          initialTags={entry.tags.map((item) => item.tag.name)}
          initialLocation={
            entry.latitude != null && entry.longitude != null
              ? {
                  latitude: entry.latitude,
                  longitude: entry.longitude,
                  label: entry.locationName,
                }
              : null
          }
        />
      </main>
    </div>
  );
};

export default EditEntryPage;
