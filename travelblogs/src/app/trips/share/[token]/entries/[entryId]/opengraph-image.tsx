import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { renderCompassFallback } from "@/components/brand/og-fallback";
import { renderPhotoCard } from "@/components/brand/og-photo-card";
import { getImageMimeTypeFromUrl } from "@/utils/media";
import {
  loadFirstAvailableImageDataUri,
  loadSharedTripSummary,
} from "@/utils/share-preview";
import { getLocaleFromAcceptLanguage, getTranslation } from "@/utils/i18n";
import { getRequestBaseUrl } from "@/utils/request-base-url";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type SharedEntryMedia = { url: string };

type SharedEntry = {
  title: string;
  coverImageUrl: string | null;
  media: SharedEntryMedia[];
};

const loadSharedEntry = async (
  baseUrl: string,
  token: string,
  entryId: string,
): Promise<SharedEntry | null> => {
  try {
    const response = await fetch(
      `${baseUrl}/api/trips/share/${token}/entries/${entryId}`,
      { method: "GET", cache: "no-store" },
    );
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error || !body?.data) {
      return null;
    }
    return body.data as SharedEntry;
  } catch {
    return null;
  }
};

const pickHeroImageCandidates = (entry: SharedEntry): string[] => {
  const candidates: string[] = [];
  if (entry.coverImageUrl) {
    candidates.push(entry.coverImageUrl);
  }
  for (const item of entry.media) {
    if (getImageMimeTypeFromUrl(item.url)) {
      candidates.push(item.url);
    }
  }
  return candidates;
};

export default async function EntryShareOpengraphImage({
  params,
}: {
  params:
    | Promise<{ token: string; entryId: string }>
    | { token: string; entryId: string };
}) {
  const { token, entryId } = await params;
  const headersList = await headers();
  const baseUrl = getRequestBaseUrl(headersList);
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const fallbackTitle = getTranslation("site.title", locale);
  const fallbackDescription = getTranslation("site.description", locale);
  const fallback = () =>
    new ImageResponse(
      renderCompassFallback(fallbackTitle, fallbackDescription),
      size,
    );

  const entry = baseUrl ? await loadSharedEntry(baseUrl, token, entryId) : null;
  const imageDataUri = entry
    ? await loadFirstAvailableImageDataUri(pickHeroImageCandidates(entry))
    : null;

  if (!entry || !imageDataUri) {
    return fallback();
  }

  const trip = baseUrl ? await loadSharedTripSummary(baseUrl, token) : null;

  try {
    return new ImageResponse(
      renderPhotoCard({
        imageDataUri,
        title: entry.title,
        titleFontSize: 56,
        subtitle: trip?.title,
      }),
      size,
    );
  } catch {
    return fallback();
  }
}
