import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import EntryReader from "../../../../../../components/entries/entry-reader";
import SharedTripGuard from "../../../../../../components/trips/shared-trip-guard";
import SharedEntryError from "../../../../../../components/entries/shared-entry-error";
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
  message?: string;
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
        message: body?.error?.message ?? undefined,
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
    return <SharedEntryError type="host" />;
  }

  const { data, error } = await loadSharedEntry(baseUrl, token, entryId);

  if (error?.code === "NOT_FOUND") {
    notFound();
  }

  if (!data) {
    return <SharedEntryError message={error?.message} type="load" />;
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
