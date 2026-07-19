import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { renderCompassFallback } from "@/components/brand/og-fallback";
import { renderPhotoCard } from "@/components/brand/og-photo-card";
import { loadImageDataUri, loadSharedTripSummary } from "@/utils/share-preview";
import { getLocaleFromAcceptLanguage, getTranslation } from "@/utils/i18n";
import { getRequestBaseUrl } from "@/utils/request-base-url";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TripShareOpengraphImage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const { token } = await params;
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

  const trip = baseUrl ? await loadSharedTripSummary(baseUrl, token) : null;
  const imageDataUri = trip?.coverImageUrl
    ? await loadImageDataUri(trip.coverImageUrl)
    : null;

  if (!trip || !imageDataUri) {
    return fallback();
  }

  try {
    return new ImageResponse(
      renderPhotoCard({
        imageDataUri,
        title: trip.title,
        titleFontSize: 60,
      }),
      size,
    );
  } catch {
    return fallback();
  }
}
