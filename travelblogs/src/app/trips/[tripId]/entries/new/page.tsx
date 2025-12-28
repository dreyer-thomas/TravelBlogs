import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import CreateEntryFormWrapper from "../../../../components/entries/create-entry-form-wrapper";
import { authOptions } from "../../../../utils/auth-options";

type NewEntryPageProps = {
  params: {
    tripId: string;
  } | Promise<{ tripId: string }>;
};

const NewEntryPage = async ({ params }: NewEntryPageProps) => {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/trips/${tripId}/entries/new`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6 py-12">
      <main className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2">
          <Link
            href={`/trips/${tripId}`}
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to trip
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            New entry
          </p>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            Add today&apos;s story
          </h1>
          <p className="text-sm text-[#6B635B]">
            Mix text and inline photos, then add any extra shots to the photo
            gallery.
          </p>
        </header>

        <CreateEntryFormWrapper tripId={tripId} />
      </main>
    </div>
  );
};

export default NewEntryPage;
