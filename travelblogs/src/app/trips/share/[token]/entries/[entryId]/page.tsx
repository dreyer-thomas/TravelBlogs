import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import EntryReader from "../../../../../../components/entries/entry-reader";
import SharedTripGuard from "../../../../../../components/trips/shared-trip-guard";
import type { EntryApiData } from "../../../../../../utils/entry-reader";
import { mapEntryToReader } from "../../../../../../utils/entry-reader";
import { getRequestBaseUrl } from "../../../../../../utils/request-base-url";

export const dynamic = "force-dynamic";

type SharedEntryPageProps = {
  params: Promise<{ token: string; entryId: string }> | {
    token: string;
    entryId: string;
  };
};

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse = {
  data: EntryApiData | null;
  error: ApiError | null;
};

const loadSharedEntry = async (
  baseUrl: string,
  token: string,
  entryId: string,
): Promise<ApiResponse> => {
  const response = await fetch(
    `${baseUrl}/api/trips/share/${token}/entries/${entryId}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.error) {
    return {
      data: null,
      error: {
        code: body?.error?.code ?? "UNKNOWN_ERROR",
        message: body?.error?.message ?? "Unable to load this entry.",
      },
    };
  }

  return {
    data: (body?.data ?? null) as EntryApiData | null,
    error: null,
  };
};

const SharedEntryPage = async ({ params }: SharedEntryPageProps) => {
  noStore();

  const { token, entryId } = await params;

  const headersList = await headers();
  const baseUrl = getRequestBaseUrl(headersList);

  if (!baseUrl) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl">
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">
              Unable to determine the host for this request.
            </p>
          </section>
        </main>
      </div>
    );
  }

  const { data, error } = await loadSharedEntry(baseUrl, token, entryId);

  if (error?.code === "NOT_FOUND") {
    notFound();
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl">
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">
              {error?.message ?? "Unable to load this entry."}
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <SharedTripGuard token={token}>
      <EntryReader
        entry={mapEntryToReader(data)}
        entryLinkBase={`/trips/share/${token}/entries`}
        backToTripHref={`/trips/share/${token}`}
      />
    </SharedTripGuard>
  );
};

export default SharedEntryPage;
