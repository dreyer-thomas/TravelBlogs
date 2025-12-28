import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import EditEntryForm from "../../../../../../components/entries/edit-entry-form";
import { prisma } from "../../../../../../utils/db";
import { authOptions } from "../../../../../../utils/auth-options";

type EditEntryPageProps = {
  params: {
    tripId: string;
    entryId: string;
  } | Promise<{ tripId: string; entryId: string }>;
};

const EditEntryPage = async ({ params }: EditEntryPageProps) => {
  const { tripId, entryId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${tripId}/entries/${entryId}/edit`);
  }
  const ownerId = session.user.id;

  const entry = await prisma.entry.findFirst({
    where: {
      id: entryId,
      tripId,
      trip: {
        ownerId,
      },
    },
    include: {
      media: true,
    },
  });

  if (!entry) {
    notFound();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2">
          <Link
            href={`/trips/${tripId}/entries/${entryId}`}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to entry
          </Link>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            Edit story
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
        />
      </main>
    </div>
  );
};

export default EditEntryPage;
