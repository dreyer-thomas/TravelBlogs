import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

import EntryReader from "../../../../../../components/entries/entry-reader";
import SharedTripGuard from "../../../../../../components/trips/shared-trip-guard";
import SharedEntryError from "../../../../../../components/entries/shared-entry-error";
import type { EntryApiData } from "../../../../../../utils/entry-reader";
import { mapEntryToReader } from "../../../../../../utils/entry-reader";
import { getRequestBaseUrl } from "../../../../../../utils/request-base-url";
import {
  getLocaleFromAcceptLanguage,
  getTranslation,
} from "../../../../../../utils/i18n";
import { loadSharedTripSummary } from "../../../../../../utils/share-preview";
import type { EntryLocation } from "../../../../../../utils/entry-location";

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

type SharedTripEntry = {
  location?: EntryLocation | null;
};

type SharedTripResponse = {
  data: {
    entries: SharedTripEntry[];
  } | null;
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

const loadSharedTripLocations = async (
  baseUrl: string,
  token: string,
): Promise<SharedTripResponse> => {
  const response = await fetch(`${baseUrl}/api/trips/share/${token}`, {
    method: "GET",
    cache: "no-store",
  });

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
    data: (body?.data ?? null) as SharedTripResponse["data"],
    error: null,
  };
};

export async function generateMetadata({
  params,
}: SharedEntryPageProps): Promise<Metadata> {
  const { token, entryId } = await params;
  const headersList = await headers();
  const baseUrl = getRequestBaseUrl(headersList);
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const fallbackTitle = getTranslation("site.title", locale);
  const fallbackDescription = getTranslation("site.description", locale);

  const { data } = baseUrl
    ? await loadSharedEntry(baseUrl, token, entryId).catch(() => ({
        data: null,
        error: null,
      }))
    : { data: null };

  if (!data) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: { title: fallbackTitle, description: fallbackDescription },
      twitter: {
        card: "summary_large_image",
        title: fallbackTitle,
        description: fallbackDescription,
      },
    };
  }

  const tripTitle = baseUrl
    ? (await loadSharedTripSummary(baseUrl, token))?.title ?? null
    : null;
  const title = tripTitle ? `${data.title} — ${tripTitle}` : data.title;
  const description = tripTitle
    ? getTranslation("share.entryDescription", locale)
        .split("{{entryTitle}}")
        .join(data.title)
        .split("{{tripTitle}}")
        .join(tripTitle)
    : getTranslation("share.entryDescriptionNoTrip", locale)
        .split("{{entryTitle}}")
        .join(data.title);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      locale: locale === "de" ? "de_DE" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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

  const readerEntry = mapEntryToReader(data);

  // Only fetch trip-wide locations if this entry has a location
  // This provides bounds context for the hero map
  let heroMapLocations: EntryLocation[] | undefined;
  if (readerEntry.location) {
    const { data: sharedTripData } = await loadSharedTripLocations(
      baseUrl,
      token,
    );
    if (sharedTripData?.entries) {
      heroMapLocations = sharedTripData.entries
        .map((entry) => entry.location ?? null)
        .filter(
          (location): location is EntryLocation =>
            location !== null &&
            Number.isFinite(location.latitude) &&
            Number.isFinite(location.longitude),
        );
    }
  }

  return (
    <SharedTripGuard token={token}>
      <EntryReader
        entry={readerEntry}
        entryLinkBase={`/trips/share/${token}/entries`}
        backToTripHref={`/trips/share/${token}`}
        mapHref={`/trips/share/${token}/map`}
        isSharedView
        heroMapLocations={heroMapLocations}
      />
    </SharedTripGuard>
  );
};

export default SharedEntryPage;
